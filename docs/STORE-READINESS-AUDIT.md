# NutriSync — App Store & Google Play Production-Readiness Audit

**Date:** 2026-06-23
**Reviewers (roles):** Apple App Store Reviewer · Google Play Reviewer · Mobile Security Engineer · Privacy Compliance Officer · Product Manager · Accessibility Auditor · QA Lead
**Artifact audited:** the actual repo (Next.js 16 PWA), its config, legal pages, billing, permissions, and in-app copy.

---

## ⚠️ Threshold finding (read first)

**NutriSync is a web app / PWA. There is no native binary.** `package.json` has **no Capacitor, Expo, React Native, or Cordova** dependency; the only "app" surface is `app/manifest.ts` (a PWA manifest). 

- **Apple App Store:** A pure website wrapped in nothing cannot be submitted. Even wrapped, Apple **4.2 (Minimum Functionality)** rejects thin web-view shells. You need a real native wrapper (Capacitor/RN) with native value, or to stay a PWA (no store at all).
- **Google Play:** Same — Play needs an APK/AAB. A Trusted Web Activity (TWA / Bubblewrap) is the minimum viable path and is generally accepted, but then **Play Billing** and **Data safety** rules fully apply.

Everything below assumes you intend to wrap this for the stores. Until a native package exists, **the app is not submittable at all.**

---

## Executive Summary

The underlying product is well-built and, notably, **legally and health-claim disciplined** — the Privacy Policy and Terms are thorough and the app avoids medical/cure/weight-loss-promise language. But it is **far from store-submittable**: there is no native package, **no billing implementation** despite advertising a paid "Coach plan," **no password-reset flow** (a hard completeness rejection), multiple **"Soon" placeholder features**, and **in-app copy describing features that don't exist** ("Restore purchases").

**Store-Readiness Score: 32 / 100.**
**Final recommendation: 🔴 Requires Significant Remediation** (submitting today = near-certain rejection on both stores).

---

## Apple App Store Rejection Risks

### 🔴 Critical
| # | Guideline | Finding | Fix |
|---|---|---|---|
| A-C1 | **4.2 Minimum Functionality** / **2.1** | No native binary — PWA only (`package.json`, `app/manifest.ts`). A thin wrapper would also fail 4.2. | Ship a real native wrapper (Capacitor) that adds native capabilities (push via APNs, camera, HealthKit) — not just a web view. |
| A-C2 | **2.1 App Completeness** | **No password reset.** `app/login/page.tsx` only does `signUp` / `signInWithPassword`; magic-link is disabled (comment lines 7–9). A user who forgets their password is permanently locked out. Reviewers test this. | Implement `supabase.auth.resetPasswordForEmail` + a reset screen, or re-enable magic-link OTP. |
| A-C3 | **2.1** / **3.1.1 In-App Purchase** | The app **advertises a paid "Coach plan"** (`app/settings/subscription/page.tsx`, `lib/help/articles/account.ts`) but **billing is unimplemented** ("Soon"). If you monetize digital content, Apple **requires StoreKit IAP** — Stripe/web checkout is rejected (3.1.1). Shipping the upsell with no working purchase is also a 2.1 incomplete-feature reject. | Either remove all paid-plan UI before submission, or implement StoreKit IAP for the Coach plan. |
| A-C4 | **2.3.1 Accurate Metadata** / **5.x** | In-app copy references features that **do not exist**: Help Center says "**Restore purchases** in Settings → Subscription" (`lib/help/articles/account.ts:101,105`) — there is no restore and no purchase. Describing non-existent functionality is a misrepresentation. | Remove/disable the billing + restore help content until billing ships. |

### 🟠 High
| # | Guideline | Finding | Fix |
|---|---|---|---|
| A-H1 | **4.2 / 2.1** | **Placeholder "Soon" features** throughout: `app/settings/integrations/page.tsx` (Apple Health, Google Health, Garmin, Fitbit, Oura, Whoop), `app/settings/subscription/page.tsx` (billing history, upgrade), `app/settings/support/page.tsx` (contact support). Visible "coming soon" stubs are a classic 4.2/2.1 reject. | Hide unfinished rows behind a flag; show only shipped features. |
| A-H2 | **1.4.1 / 5.2.3 Health** | If you list **"Apple Health"** as an integration (even "Soon"), reviewers expect HealthKit handled per guidelines. It's not integrated (no entitlement). Listing it implies a capability you don't have. | Remove the Apple Health row until HealthKit is actually implemented with the required entitlement + purpose strings. |
| A-H3 | **5.1.1(v) Account Deletion** | Deletion **exists** (`/api/delete-account`) ✅ — but the Privacy Policy/Terms tell users it's under "**Edit profile → Help**" while it actually lives at **Settings → Privacy → Danger zone** (`app/settings/privacy/PrivacyClient.tsx`). Reviewers follow the documented path; a dead instruction reads as "no deletion." | Fix the path text in `app/privacy/page.tsx` and `app/terms/page.tsx` to "Settings → Privacy → Delete account." |

### 🟡 Medium
| # | Guideline | Finding | Fix |
|---|---|---|---|
| A-M1 | **5.1.1 Data Collection & Storage** | "Sign in with Apple" is **required** (4.8/5.x) if you offer any third-party login. You currently only have email/password, so this is **not** triggered today — but if you add Google/social login, you must add Apple. | N/A now; gate for the future. |
| A-M2 | **1.4 / 5.2.3** AI + health | Food photo/nutrition AI (`app/api/analyze-photo`, `lib/anthropic.ts`) has **no in-product "estimate / not medical advice" disclaimer** at the point of use (only in legal pages + Help Center). Apple expects AI limitations surfaced where used. | Add a one-line "Estimates only — not medical advice" note in the meal-logger result UI (`components/MealLogger.tsx`). |
| A-M3 | **4.0 Design / Accessibility** | 36px touch targets, empty `alt`, low-contrast `text-stone-500/600` on `stone-950`, no modal focus trap (see Accessibility section). | See Accessibility fixes. |

### 🟢 Low
- **A-L1 (2.5.x):** Web push is in use; on iOS, web push only works for installed PWAs (iOS 16.4+). In a Capacitor wrapper you'd switch to APNs. Note for wrapping.
- **A-L2 (5.1.2):** Meal/profile photos are stored at **public URLs** (Privacy Policy admits "viewable by anyone with the link"). Not a rejection, but a privacy posture reviewers may question. Consider signed URLs.

---

## Google Play Rejection Risks

### 🔴 Critical
| # | Policy | Finding | Fix |
|---|---|---|---|
| G-C1 | **Packaging** | No AAB/APK; PWA only. | Wrap as a TWA (Bubblewrap) or Capacitor app. |
| G-C2 | **Subscriptions / Payments** | Advertises a paid plan with no **Google Play Billing**; web/Stripe billing for in-app digital goods violates the Payments policy. Plus the "Restore purchases" copy describes a non-existent flow (**Deceptive Behavior**). | Implement Play Billing or remove paid-plan/restore UI before submission. |
| G-C3 | **Account deletion (Play Data deletion policy)** | Deletion exists ✅, but Play **also requires a web-accessible deletion URL** for the store listing, and the in-app instructions point to the wrong place. | Provide a public account-deletion URL; fix in-app path text. |

### 🟠 High
| # | Policy | Finding | Fix |
|---|---|---|---|
| G-H1 | **Data safety form** | You must declare every data type collected. Based on `app/privacy/page.tsx`: email, name, photos, **health/fitness data** (weight, nutrition, activity, hydration), approximate profile data, push token, usage logs, and **data shared with Anthropic** (AI). Health data has heightened disclosure duties. | Complete the Data safety form to exactly match the Privacy Policy; declare Anthropic processing and that data isn't sold. |
| G-H2 | **Health Apps policy** | Nutrition/weight tracking is "health." Policy forbids medical claims — **you're compliant** (good), but you must self-certify and keep the "not medical advice" disclaimer (present in legal pages; add in-product per A-M2). | Keep disclaimers; certify Health declaration. |
| G-H3 | **AI-Generated Content policy** | Photo→nutrition and Copilot drafts are AI-generated. Play requires in-app reporting/feedback for objectionable AI output where users generate content, and accurate disclosure. | Add a "report/incorrect estimate" affordance on AI results; ensure store listing discloses AI. |
| G-H4 | **Permissions** | Camera (via `getUserMedia` in `components/BarcodeScanner.tsx` + `<input accept="image/*">`) must be justified; a TWA inherits browser permission prompts, but a Capacitor build needs a clear in-context rationale and minimal scope. No excessive permissions found. | Add an in-context camera rationale before first use; declare only camera + notifications. |

### 🟡 Medium / 🟢 Low
- **G-M1 (Deceptive/Min-functionality):** the same "Soon" stubs as Apple A-H1.
- **G-L1:** Foreground/exact-alarm and background permissions not used (good). Web push token handled via `push_subscriptions` — declare it.

---

## Health & Nutrition Compliance — ✅ largely clean

I grepped all user-facing copy for `cure|treat|diagnos|disease|guaranteed|lose N lbs|medical|prescri|clinically`. **No violations.** The app consistently frames numbers as **estimates** and includes explicit "**Not medical advice**" clauses in both `app/privacy/page.tsx` and `app/terms/page.tsx`. Calorie targets are described as "general estimates." **This is the app's strongest compliance area.**
- **One gap:** the disclaimer is not shown **in-product** at the AI estimate (A-M2). Add it to close the loop.

---

## AI Feature Audit

| Feature | File | Disclosure | Human oversight | Risk |
|---|---|---|---|---|
| Food photo analysis | `app/api/analyze-photo`, `lib/anthropic.ts` | Legal pages ✅; in-product ❌ | User reviews/edits before saving ✅ | Medium — add inline "estimate" note + "report" affordance |
| Nutrition estimation (by name/barcode) | `lib/anthropic.ts`, `/api/search-food`, `/api/barcode` | Legal ✅ | User edits ✅ | Low |
| Coach Copilot drafts | `/api/coach/draft`, `lib/copilot-ai.ts` | — | **Coach must explicitly send** (drafts never auto-deliver) ✅ | Low — strong human-in-the-loop |
| Weekly report / Recommendations | `lib/weekly-review.ts`, `lib/coach-intel.ts` | Deterministic, not LLM | N/A | Low — no medical advice generated |

No misleading automation claims found. No AI medical advice. Good posture; just surface disclosure + a feedback path in-product.

---

## Subscription & Billing Audit — 🔴 not implemented

- **No billing exists.** `app/settings/subscription/page.tsx` shows plan label + "billing history (Soon)" + "upgrade (Soon)." No StoreKit, no Play Billing, no Stripe (only a code comment).
- **Missing every required element:** price display, billing period, free-trial terms, auto-renew disclosure, "Manage/Cancel" link, **Restore Purchases**, and links to Terms/Privacy on the paywall.
- **Worse:** Help Center (`lib/help/articles/account.ts`) tells users how to "Restore purchases" and "cancel in your app store" — **none of which exist** (deceptive content).
- **Fix:** Either (a) **remove all paid-plan and restore UI/help** and submit as fully free, or (b) implement StoreKit (Apple) + Play Billing (Google) with a compliant paywall (price, period, trial terms, auto-renew language, restore, manage-subscription deep link, Terms/Privacy links).

---

## Privacy Audit — strong, with fixable gaps

| Requirement | Status | Evidence / Fix |
|---|---|---|
| Privacy Policy | ✅ Pass | `app/privacy/page.tsx` — collection, AI processing, sub-processors (Supabase/Anthropic/Vercel/USDA/OFF), "we do not sell," retention, 16+, security, not-medical-advice. |
| Terms of Service | ✅ Pass | `app/terms/page.tsx`. |
| Delete account | ✅ Pass (works) / ⚠️ wrong instructions | `/api/delete-account` deletes the auth user (cascades). Fix the documented path (A-H3/G-C3). |
| Data export | ✅ Pass | `/api/export-data` (JSON). **Add a mention in the Privacy Policy** ("Your choices") — currently omitted. |
| Consent | ⚠️ Needs review | No explicit consent checkbox at signup linking Terms/Privacy. **Add "By creating an account you agree to Terms & Privacy" with links on `app/login/page.tsx`.** |
| Children | ✅ Pass | 16+ stated in both policies. |
| Last-updated date | ✅ | "June 14, 2026" — refresh on any change. |

---

## Permissions Audit

| Permission | Where | Justified? | Note |
|---|---|---|---|
| Camera | `components/BarcodeScanner.tsx` (`getUserMedia`), `components/MealLogger.tsx` / `AvatarUpload.tsx` / `ManageClient.tsx` (`<input accept="image/*">`) | ✅ (barcode scan, meal/profile photos) | PWA = browser-managed. **Native wrap needs `NSCameraUsageDescription` (iOS) + an in-context rationale (Android).** |
| Notifications | web-push (`push_subscriptions`, `lib/push.ts`) | ✅ | Already permission-gated; native wrap → APNs/FCM. |
| Photos library | file input | ✅ | iOS native needs `NSPhotoLibraryUsageDescription`. |
| HealthKit / Health Connect | **not used** (only "Soon" labels) | n/a | Do **not** request these entitlements unless implemented. |

No excessive permissions. Purpose strings don't exist yet because there's no native shell — **add them when wrapping**.

---

## Accessibility Audit (carried from `docs/ENGINEERING-AUDIT.md`, re-confirmed)

| Issue | Where | Fix |
|---|---|---|
| Touch targets < 44px (`w-9 h-9` = 36px) | InstallPrompt, MacroDetailModal close, ActivityCard, FeedCard | Bump to `w-11 h-11` (44px). |
| Empty/auto `alt=""` on non-decorative images | FeedCard, ActivityCard, MiniProfileModal, AvatarUpload, etc. | Add descriptive `alt` (member name / meal). |
| Low contrast secondary text | `text-stone-500/600` on `bg-stone-950` | Use `text-stone-400`+ for body text (target WCAG AA 4.5:1). |
| No focus management / modal focus-trap | overlays (MacroDetailModal, MiniProfileModal, WeeklyReview) | Trap focus; restore on close; `aria-modal`. |
| Heading hierarchy | Trends/Challenges/Weekly lack `<h2>` structure | Add semantic headings. |
| Font scaling | verify Dynamic Type / `rem` scaling holds | Test at 200% text size. |

---

## Design Audit (rejection-relevant)

- **Placeholder content:** the "Soon" rows (integrations, billing, support) are visible dead-ends → **remove before submission**.
- **Empty states:** generally good (dashboard, feed, challenges, help all have empty states). ✅
- **Dead navigation:** Help Center "Contact support" is "Soon" (dead); subscription upgrade is "Soon" (dead). Fix or hide.
- **Debug elements:** none found. ✅
- **Broken layouts:** none found in code review; the one fixed issue (weekly review safe-area, PR #57) shows attention to this. Verify on-device.

---

## QA Audit (flow-by-flow)

| Flow | Status | Note |
|---|---|---|
| Sign up | ✅ works | `signUp` email/password |
| Login | ✅ works | `signInWithPassword` |
| **Password reset** | 🔴 **MISSING** | No reset path — lockout risk (A-C2) |
| Meal logging | ✅ | photo/search/barcode |
| Activity logging | ✅ | |
| Water logging | ✅ | with undo |
| Group create/join | ✅ | invite code RPC |
| Challenge create | ✅ | (needs migration 041 for new types) |
| Weekly report | ✅ | |
| **Subscription purchase** | 🔴 **MISSING** | not implemented |
| **Subscription restore** | 🔴 **MISSING** | not implemented (but advertised) |
| Account deletion | ✅ works | wrong instructions in policies |
| Edge cases | ⚠️ | per `docs/ENGINEERING-AUDIT.md` QA list (no tests, input validation gaps, double-tap duplicate logs) |

---

## Metadata Audit

- In-app metadata is clean: `app/layout.tsx` title "NutriSync," description "Track every micronutrient. See what your crew eats." — no unsupported claims.
- **Store listing assets are not in the repo** (screenshots, preview video, keywords live in App Store Connect / Play Console). **Cannot be audited here — flag for manual review.** When writing them: avoid any "lose weight," "clinically," or health-outcome claims (would require evidence); keep to "track," "log," "stay accountable."

---

## Analytics Audit

- ✅ Core actions instrumented (PR #60, `app_events`): meal/activity/water/weight logged, group create/join, challenge create/complete; plus weekly-review + help events.
- ❌ **Missing:** `signup`, `login`, onboarding-completion, **subscription conversion** (can't exist — no billing), and retention is derivable but not explicit.
- **Fix:** add `signup`/`login`/`onboarding_completed` events; add subscription funnel events when billing ships.

---

## Security Audit (store-relevant summary; full detail in `docs/ENGINEERING-AUDIT.md`)

- ✅ Strong: service-role key server-only, RLS + ownership checks, CRON_SECRET, no SQL injection, group-gated push, weight-privacy invariant.
- ⚠️ In-memory rate limiter (per-instance, bypassable at scale), some `req.json()` lacking try/catch, public photo URLs.
- No secrets in client bundle. Session handling via Supabase SSR cookies. Acceptable for submission; harden per engineering audit.

---

## Missing Compliance Requirements (exact fixes)
1. **Native package** (Capacitor or TWA) — prerequisite for any submission.
2. **Billing**: implement StoreKit + Play Billing **or** remove all paid-plan/restore UI (`app/settings/subscription/page.tsx`) and help copy (`lib/help/articles/account.ts`).
3. **Password reset**: add `resetPasswordForEmail` + reset screen (`app/login/`).
4. **Remove "Soon" stubs**: `app/settings/integrations/page.tsx`, subscription, support.

## Missing Legal Requirements (exact fixes)
1. Fix deletion path text in `app/privacy/page.tsx` + `app/terms/page.tsx` → "Settings → Privacy → Delete account."
2. Add **data export** to the Privacy Policy "Your choices" list.
3. Add Terms/Privacy **consent + links at signup** (`app/login/page.tsx`).
4. Public, web-accessible **account-deletion URL** for the Play listing.

## Missing Privacy Requirements (exact fixes)
1. Complete the **Play Data safety** form to match the policy (incl. health data + Anthropic processing + "not sold").
2. Apple **Privacy Nutrition Labels** in App Store Connect (same data map).
3. Consider **signed URLs** for meal/profile photos (currently public).

## Missing Accessibility Requirements (exact fixes)
1. 44px min touch targets. 2. Descriptive `alt`. 3. AA contrast on secondary text. 4. Modal focus-trap + restore. 5. Heading hierarchy. 6. Verify Dynamic Type at 200%.

---

## Pre-Submission Checklist

| Requirement | Status |
|---|---|
| Native binary (Capacitor/TWA) | ❌ Fail |
| App completeness — no broken/placeholder features | ❌ Fail (Soon stubs) |
| Password reset / account recovery | ❌ Fail |
| IAP/Play Billing (if monetized) | ❌ Fail (advertised, not built) |
| No copy describing non-existent features | ❌ Fail (restore purchases) |
| Privacy Policy (hosted, complete) | ✅ Pass |
| Terms of Service | ✅ Pass |
| Account deletion (in-app) | ✅ Pass (works) |
| Account deletion — correct documented path | ❌ Fail (wrong path) |
| Account deletion — public URL (Play) | ⚠️ Needs Review |
| Data export | ✅ Pass |
| Signup consent + Terms/Privacy links | ⚠️ Needs Review |
| No medical/disease/weight-loss-promise claims | ✅ Pass |
| In-product AI "estimate / not medical advice" notice | ❌ Fail (legal-only) |
| AI content report/feedback affordance (Play) | ❌ Fail |
| Permissions justified + purpose strings | ⚠️ Needs Review (strings come with native wrap) |
| Data safety / privacy labels | ⚠️ Needs Review (must be filled) |
| Accessibility (targets/contrast/alt/focus) | ❌ Fail |
| Crash-free core flows | ✅ Pass (logging/social work) |
| Store listing assets (screenshots/keywords) | ⚠️ Needs Review (external, not in repo) |
| Core analytics (signup/login/subscription) | ⚠️ Needs Review (partial) |
| Security fundamentals | ✅ Pass (with hardening backlog) |

---

## Final Recommendation

# 🔴 Requires Significant Remediation

The product's content compliance (health claims, privacy, terms, AI human-oversight) is genuinely strong — better than many shipping apps. But it is **not submittable** in its current form: there is no native package, no working billing for the paid plan it advertises, no password reset, visible placeholder features, and in-app copy describing functionality that doesn't exist. Submitting today would draw rejections under Apple **2.1, 3.1.1, 4.2** and Google **Payments, Deceptive Behavior, and Min-Functionality** within the first review.

**Shortest path to "Ready After Minor Fixes":** (1) wrap with Capacitor/TWA; (2) **remove** the paid-plan + restore + "Soon" UI and ship 100% free for v1; (3) add password reset; (4) fix the deletion-path text + signup consent; (5) add the in-product AI estimate disclaimer; (6) do the accessibility pass. That converts the worst Critical/High items without building a billing system, and is achievable in roughly 1–2 weeks of focused work.
