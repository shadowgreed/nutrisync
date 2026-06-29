# NutriSync — Native Home-Screen Widget

**Goal:** a glanceable home-screen tile showing **today's calories vs target, water vs target, and the logging streak** — on iOS and Android.

**Status:** the *data contract* (this repo) is built and tested. The *native widget* is a native-project task that must be done in Xcode / Android Studio — it cannot be compiled or tested in the web repo. This doc specifies it end-to-end.

---

## Why this needs native code

A home-screen widget is an OS surface, not a web surface. There is **no way to ship a real home-screen widget from a PWA**:

- **iOS** widgets are built with **WidgetKit** (SwiftUI) in an app extension.
- **Android** widgets are **App Widgets**, today written with **Glance** (Jetpack Compose).

Both require the app to be a **native binary**. NutriSync is a PWA with no native wrapper, so step 0 is the Capacitor wrap that's already on the store-readiness roadmap (`docs/STORE-REMEDIATION.md`). Once the app is wrapped, the widget extensions slot in.

---

## Architecture: app writes, widget reads

Widgets run in a separate, resource-constrained process with strict refresh budgets and **no access to the app's cookies / Supabase session**. The robust, standard pattern is **not** "widget calls the API" — it's:

```
 ┌────────────────────┐   poll /api/widget/summary   ┌──────────────┐
 │  NutriSync (web)   │ ───────────────────────────► │  Supabase    │
 │  inside Capacitor  │ ◄─────────────────────────── │              │
 └─────────┬──────────┘        WidgetSummary JSON     └──────────────┘
           │ write snapshot to platform shared store
           ▼
 ┌────────────────────┐        read snapshot          ┌──────────────┐
 │ Shared container    │ ────────────────────────────►│  Widget      │
 │ App Group / DataStore│       (no network)           │ WidgetKit /  │
 └────────────────────┘                                │   Glance     │
                                                       └──────────────┘
```

- The **web app** (which holds the session) calls `GET /api/widget/summary` and writes the JSON into the platform's shared store via a small Capacitor plugin. Do this on: app foreground, and after each meal/water log.
- The **widget** reads that snapshot from the shared store and renders. It never authenticates and never needs the network — so it's instant, private, and offline-safe.
- The widget also asks the OS to refresh on a timeline (e.g. every 30–60 min) to re-read the store and re-render.

This keeps the auth token out of the widget process entirely.

---

## The data contract (already built in this repo)

- **`GET /api/widget/summary`** → `app/api/widget/summary/route.ts`. Auth'd (session cookie, available inside the Capacitor webview). Returns:

```jsonc
{
  "date": "2026-06-28",                       // today in the user's timezone
  "calories": { "consumed": 1840, "target": 2100 },
  "water":    { "ml": 1500, "targetMl": 2500 },
  "streak":   12,
  "updatedAt": "2026-06-28T17:04:00.000Z"
}
```

- Shape + computation: `lib/widget.ts#buildWidgetSummary` (pure, unit-tested in `tests/widget.test.ts`). Totals are summed in the **user's timezone** so the widget matches the dashboard exactly.
- `Cache-Control: private, max-age=60` de-dupes bursts.

This is the single source of truth both platforms consume — implement the native side against this JSON.

---

## Step 0 — Capacitor wrap (prerequisite)

```bash
npm i @capacitor/core @capacitor/ios @capacitor/android
npm i -D @capacitor/cli
npx cap init NutriSync app.nutrisync --web-dir=out   # or a server.url config for the hosted PWA
npx cap add ios
npx cap add android
```

For a server-rendered Next.js app, the simplest wrap points the native shell at the hosted URL via `capacitor.config.ts` `server.url`. The widget data bridge below is independent of how the webview is hosted.

Write a tiny **Capacitor plugin** (or use `@capacitor/preferences` with a shared-group config) exposing `setWidgetSnapshot(json)` that writes to the shared store and calls the OS "reload widget timelines" API.

---

## iOS — WidgetKit

1. **App Group** (shared storage): add capability `group.app.nutrisync.widget` to both the app target and the widget extension.
2. The Capacitor plugin writes the snapshot:
   ```swift
   let defaults = UserDefaults(suiteName: "group.app.nutrisync.widget")
   defaults?.set(jsonString, forKey: "summary")
   WidgetCenter.shared.reloadAllTimelines()
   ```
3. **Widget extension** (`File ▸ New ▸ Target ▸ Widget Extension`). Skeleton:

```swift
import WidgetKit
import SwiftUI

struct Summary: Codable {
    struct Cals: Codable { let consumed: Int; let target: Int? }
    struct Water: Codable { let ml: Int; let targetMl: Int }
    let date: String; let calories: Cals; let water: Water; let streak: Int
}

struct Entry: TimelineEntry { let date: Date; let summary: Summary? }

struct Provider: TimelineProvider {
    func placeholder(in _: Context) -> Entry { Entry(date: .now, summary: nil) }
    func getSnapshot(in _: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, summary: load()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        completion(Timeline(entries: [Entry(date: .now, summary: load())], policy: .after(next)))
    }
    private func load() -> Summary? {
        guard let s = UserDefaults(suiteName: "group.app.nutrisync.widget")?.string(forKey: "summary"),
              let d = s.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Summary.self, from: d)
    }
}

struct NutriSyncWidgetView: View {
    let entry: Entry
    var body: some View {
        let cal = entry.summary?.calories
        VStack(alignment: .leading, spacing: 6) {
            Text("NutriSync").font(.caption2).foregroundStyle(.secondary)
            Text("\(cal?.consumed ?? 0)\(cal?.target != nil ? " / \(cal!.target!)" : "") kcal")
                .font(.headline)
            HStack(spacing: 10) {
                Label("\(entry.summary?.water.ml ?? 0)ml", systemImage: "drop.fill")
                Label("\(entry.summary?.streak ?? 0)d", systemImage: "flame.fill")
            }.font(.caption)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct NutriSyncWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NutriSyncWidget", provider: Provider()) { e in
            NutriSyncWidgetView(entry: e)
        }
        .configurationDisplayName("Today")
        .description("Your calories, water, and streak.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

Tapping the widget deep-links into the app via the widget's `widgetURL(...)` (point it at `/dashboard`).

---

## Android — App Widget (Glance)

1. **Shared storage:** Jetpack **DataStore** (or `EncryptedSharedPreferences`) accessible to the app + widget process. The Capacitor plugin writes the snapshot string, then calls `NutriSyncWidget().updateAll(context)`.
2. **Glance widget** skeleton:

```kotlin
class NutriSyncWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val json = context.widgetDataStore.data.first()[stringPreferencesKey("summary")]
    val s = json?.let { Json.decodeFromString<Summary>(it) }
    provideContent {
      Column(GlanceModifier.padding(12.dp)) {
        Text("NutriSync", style = TextStyle(fontSize = 11.sp))
        Text("${s?.calories?.consumed ?: 0}" +
             (s?.calories?.target?.let { " / $it" } ?: "") + " kcal",
             style = TextStyle(fontWeight = FontWeight.Bold))
        Row { Text("💧 ${s?.water?.ml ?: 0}ml   🔥 ${s?.streak ?: 0}d") }
      }
    }
  }
}

@Serializable data class Cals(val consumed: Int, val target: Int? = null)
@Serializable data class Water(val ml: Int, val targetMl: Int)
@Serializable data class Summary(val date: String, val calories: Cals, val water: Water, val streak: Int)

class NutriSyncWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget = NutriSyncWidget()
}
```

3. Register `NutriSyncWidgetReceiver` in `AndroidManifest.xml` with an `appwidget-provider` XML (size, preview, update period).

---

## Refresh strategy

- **Primary:** the app pushes a fresh snapshot to the shared store after every relevant action (foreground, meal log, water log) and reloads the widget — so the widget is current the moment the user logs.
- **Secondary:** the widget's own timeline reloads every ~30–60 min as a backstop. Don't poll the network from the widget itself — read the shared store.
- Respect platform budgets: iOS limits widget refreshes; Android `updatePeriodMillis` has a 30-min floor. The app-push path is what keeps it feeling live.

---

## Auth & privacy notes

- The widget never holds the Supabase token — only the app does. The shared store holds **derived, non-sensitive totals** (calories/water/streak), not credentials or raw logs.
- On logout, the Capacitor plugin must **clear** the shared store and reload the widget so a signed-out device shows an empty/placeholder tile.
- `/api/widget/summary` is session-authed; it returns only the caller's own data.

---

## Checklist

- [x] `GET /api/widget/summary` endpoint (`app/api/widget/summary/route.ts`)
- [x] Pure snapshot logic + tests (`lib/widget.ts`, `tests/widget.test.ts`)
- [ ] Capacitor wrap (`ios/`, `android/`) — prerequisite, shared with store packaging
- [ ] Capacitor `setWidgetSnapshot` plugin (writes shared store + reloads widget)
- [ ] App calls the plugin on foreground + after meal/water logs
- [ ] iOS WidgetKit extension + App Group
- [ ] Android Glance widget + DataStore + manifest receiver
- [ ] Logout clears the shared store
- [ ] Deep-link tap → `/dashboard`
