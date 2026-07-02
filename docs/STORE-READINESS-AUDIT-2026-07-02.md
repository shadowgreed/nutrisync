# NutriSync — App Store & Google Play Production-Readiness Audit (Re-Audit)

**Date:** 2026-07-02
**Reviewers (roles):** Apple App Store Reviewer · Google Play Reviewer · Mobile Security Engineer · Privacy Compliance Officer · Product Manager · Accessibility Auditor · QA Lead
**Artifact audited:** the actual repo (Next.js 16 PWA) @ `main` `ddfe52a` — config, legal pages, billing, permissions, in-app copy.
**Supersedes:** `docs/STORE-READINESS-AUDIT-2026-06-27.md` (score 78/100), which superseded `docs/STORE-READINESS-AUDIT.md` (2026-06-23, score 32/100).

---

## ⚠️ Threshold finding (read first) — UNCHANGED

**NutriSync is still a web app / PWA. There is no native binary.** `package.json` has no Capacitor, Expo, React Native, or Cordova dependency (verified — 0 matches).

- **Apple:** a pure website cannot be submitted; a thin web-view shell fails **4.2 (Minimum Functionality)**.
- **Google Play:** needs an APK/AAB; a TWA (Bubblewrap) is the minimum path.

**This remains the single hard gate — and it is now the *only* app-level gate.** Two planning docs now cover the wrap end-to-end: `docs/STORE-REMEDIATION.md` (packaging, purpose strings, QA plan, listing copy) and, new since the last audit, `docs/WIDGET-IMPLEMENTATION.md` (the Capacitor plugin + shared-store architecture the home-screen widget needs). The `/api/widget/summary` endpoint is already live awaiting the native shell.

---

## Executive Summary

The 2026-06-23 audit found five blocker classes beyond packaging; the 2026-06-27 re-audit confirmed all five fixed with two accessibility items still partial. **This pass confirms those last two are now fully resolved** — every sub-44px touch target and low-contrast token remaining in the codebase is decorative (`aria-hidden` icons / avatar divs), not an interactive control or body text. Every previously-resolved item was re-verified and still holds. The three features shipped since (Sunday-gated weekly review, water-goal feed milestone, widget data endpoint) were reviewed through a store lens and are clean.

**Content & compliance readiness: ~92/100.** In-repo, there is nothing left to fix before packaging.
**Holistic Store-Readiness Score: 80 / 100** (32 → 78 → 80), gated by the still-absent native package.

**Final recommendation: 🟡 Ready After Packaging** — unchanged in category, but the pre-packaging checklist is now empty.

---

## Apple App Store — status of prior findings

| # | Guideline | Finding | 06-27 | Now |
|---|---|---|---|---|
| A-C1 | 4.2 / 2.1 | No native binary | 🔴 | 🔴 **STILL OPEN — the only remaining gate** |
| A-C2 | 2.1 | Password reset | ✅ | ✅ Holds (`/forgot-password` + `/reset-password`, linked from login:121) |
| A-C3 | 3.1.1 | Paid plan w/o billing | ✅ | ✅ Holds (honest free copy, no IAP language) |
| A-C4 | 2.3.1 | "Restore purchases" phantom copy | ✅ | ✅ Holds (0 matches in help articles) |
| A-H1 | 4.2 | "Soon" placeholder stubs | ✅ | ✅ Holds (integrations `redirect('/settings')`; support real links) |
| A-H2 | 5.2.3 | Implied Apple Health capability | ✅ | ✅ Holds |
| A-H3 | 5.1.1(v) | Wrong documented deletion path | ✅ | ✅ Holds (privacy:49-50, terms:30 correct; export mentioned) |
| A-M2 | 5.2.3 | In-product AI disclaimer | ✅ | ✅ Holds (`AiDisclaimer` in MealLogger:441; `/api/ai-feedback` live) |
| A-M3 | 4.0 | Accessibility | 🟡 | ✅ **RESOLVED** — see Accessibility below |

**New-feature review (4.2 / 2.1 lens):**
- **Sunday-gated weekly review** — no "broken feature" risk: the non-Sunday Trends state is a deliberate disabled card (`opacity-70`, `aria-disabled`, "Unlocks every Sunday"), and direct `/weekly` visits redirect server-side. Reads as a designed ritual, not a dead end.
- **Water-goal milestone** — celebration copy only; no purchase/placeholder language.
- **`/api/widget/summary`** — inert for review: authed JSON endpoint, no UI surface.

---

## Google Play — status of prior findings

| # | Policy | Finding | 06-27 | Now |
|---|---|---|---|---|
| G-C1 | Packaging | No AAB/APK | 🔴 | 🔴 **STILL OPEN** |
| G-C2 | Payments/Deceptive | Advertised plan + restore copy | ✅ | ✅ Holds |
| G-C3 | Account deletion | In-app path ✅ / public URL | 🟡 | 🟡 Public web-accessible deletion URL still needed (external, at listing time) |
| G-H1 | Data safety form | Must match policy | ⚠️ | ⚠️ External (Play Console, at listing time) |
| G-H2 | Health Apps | No medical claims | ✅ | ✅ Holds (in-product disclaimer live) |
| G-H3 | AI content | Report affordance | ✅ | ✅ Holds ("report an incorrect estimate" → `/api/ai-feedback`) |
| G-H4 | Permissions | Camera rationale + purpose strings | ⚠️ | ⚠️ At packaging (documented in STORE-REMEDIATION.md) |

---

## Health & Nutrition Compliance — ✅ still clean

Re-grepped user-facing copy for medical/cure/guarantee/weight-loss-promise language, including the new weekly-review and water-goal strings: **no violations**. Estimates framed as estimates; "not medical advice" present in legal pages **and** in-product at the point of AI use.

## AI Feature Audit — unchanged, low risk

Photo analysis (in-product disclosure ✅, user edits before save ✅, report affordance ✅), name/barcode estimation (user edits ✅), Copilot drafts (coach must send ✅), weekly review (deterministic). No new AI surfaces since the last audit.

## Privacy Audit — holds, one addition

| Requirement | Status |
|---|---|
| Policy/Terms, deletion path, export, consent + audit trail, 16+ | ✅ All re-verified, unchanged |
| **New:** widget data flow | ✅ Clean — `/api/widget/summary` returns only the caller's derived totals; `Cache-Control: private`. The widget doc mandates that only derived totals (never tokens/raw logs) enter the native shared store and that logout clears it. |
| Public deletion URL (Play) | ⚠️ External |
| Signed URLs for photos | 🟢 Low, unchanged (public URLs; disclosed in policy) |

## Accessibility Audit — ✅ RESOLVED (code-level complete)

| Issue | 06-27 | Now |
|---|---|---|
| Empty/auto `alt=""` | ✅ (0) | ✅ 0 |
| Modal focus-trap / `aria-modal` | ✅ | ✅ `useFocusTrap` in 3 modals; Escape handling in feed sheet + lightbox |
| Heading hierarchy | ✅ | ✅ `<h2>` on Dashboard/Trends/Challenges |
| Touch targets < 44px | 🟡 (10) | ✅ **RESOLVED** — 5 remaining `w-9/w-10` hits are all decorative divs/avatars; zero interactive controls under 44px |
| Low-contrast text | 🟡 (7) | ✅ **RESOLVED** — all 6 remaining `text-stone-600` are `aria-hidden` icons; breadcrumb separator fixed to `stone-400` |
| Font scaling at 200% | ⚠️ | ⚠️ Still verify on-device at packaging QA |

(One cosmetic nit: the ChevronRight at `app/settings/_ui.tsx:43` lacks `aria-hidden` — consistency, not compliance.)

## Analytics Audit — ✅ holds

signup / login / onboarding_completed plus all core events re-verified firing. N/A: subscription funnel (app is free).

## Security Audit (store-relevant) — improved

Base intact (service-role isolation, RLS, CRON_SECRET, group-gated push). Since last audit: input bounds on the log routes, comments UPDATE policy, and the three new surfaces reviewed clean (widget endpoint self-scoped; water-goal milestone non-forgeable via RLS + server-computed data; Sunday gate server-side). Remaining hardening backlog (in-memory rate limiter, 11 unguarded `req.json()` sites in coach/group routes, no global body cap) is tracked in the engineering audit and is **not** submission-blocking.

---

## Pre-Submission Checklist (delta)

| Requirement | 06-23 | 06-27 | **Now** |
|---|---|---|---|
| Native binary (Capacitor/TWA) | ❌ | ❌ | ❌ **(the only in-repo gate)** |
| App completeness — no placeholders | ❌ | ✅ | ✅ |
| Password reset | ❌ | ✅ | ✅ |
| Billing (if monetized) | ❌ | ✅ N/A | ✅ N/A (free) |
| No phantom-feature copy | ❌ | ✅ | ✅ |
| Privacy Policy / Terms | ✅ | ✅ | ✅ |
| Deletion: works + documented path | ✅/❌ | ✅ | ✅ |
| Data export (+ in policy) | ✅ | ✅ | ✅ |
| Signup consent + links | ⚠️ | ✅ | ✅ |
| No medical claims | ✅ | ✅ | ✅ |
| In-product AI disclaimer | ❌ | ✅ | ✅ |
| AI report/feedback affordance | ❌ | ✅ | ✅ |
| Accessibility (targets/contrast/alt/focus/headings) | ❌ | 🟡 | ✅ **complete at code level** |
| Core analytics | ⚠️ | ✅ | ✅ |
| New features read as intentional (4.2) | — | — | ✅ (Sunday gate, water-goal) |
| Deletion public URL (Play) | ⚠️ | ⚠️ | ⚠️ external |
| Data safety / privacy labels | ⚠️ | ⚠️ | ⚠️ external |
| Purpose strings / camera rationale | ⚠️ | ⚠️ | ⚠️ at packaging |
| Store listing assets | ⚠️ | ⚠️ | ⚠️ external |

---

## Remaining work to "Ready to Submit"

**In-repo:** **nothing** remains before packaging. (Optional polish, not gating: a `shortcuts` array in `app/manifest.ts` for long-press quick-actions — Log meal / Log water / Today — a ~30-minute win that improves the installed-app experience on both platforms.)

**Packaging (the gate):**
1. Execute the Capacitor wrap per `docs/STORE-REMEDIATION.md` — APNs/FCM push, camera, purpose strings, in-context camera rationale.
2. While in there, the widget plugin per `docs/WIDGET-IMPLEMENTATION.md` shares the same native project — the data endpoint is already live.

**Store-console (external):**
3. Play **Data safety** + Apple **Privacy Nutrition Labels** matching the Privacy Policy (health data + Anthropic processing + "not sold").
4. Public account-deletion URL for the Play listing.
5. Listing assets (screenshots/keywords) avoiding health-outcome claims.
6. On-device QA incl. 200% font scaling.

---

## Score

| | 06-23 | 06-27 | **07-02** |
|---|---|---|---|
| Content & compliance readiness | ~32 | ~90 | **~92** |
| **Holistic Store-Readiness (gated by packaging)** | **32** | **78** | **80 / 100** |

# 🟡 Ready After Packaging

Unchanged in category — but the meaning has tightened: at the last audit "ready after packaging" still carried a two-line accessibility punch list; now the **pre-packaging checklist is empty**. Every app-level finding across three audit generations is resolved and holding, and the codebase is accumulating packaging *preparation* (widget data contract + implementation guide) ahead of the wrap. The next material score movement requires the Capacitor/TWA shell itself.
