# NutriSync — App Overview

A social nutrition and fitness tracking PWA: log meals, water, activity, and weight; see AI-assisted nutrition estimates and trends; share progress with a small private group; optionally get coached by a real person backed by an AI "Copilot."

## What it does

- **Meal logging** — manual entry, food search (USDA FoodData Central + Open Food Facts), barcode scanning, or a meal photo analyzed by Claude Vision for foods + nutrition.
- **Water, activity, and weight logging** — quick-add water, duration/intensity-based activity logging with estimated calorie burn, and weight check-ins.
- **Trends** — calorie/macro/nutrient history and streaks over time.
- **Group feed** — a small private group (created via invite code, founder-approved) sees each other's shared meals and activities, with likes, comments, replies, and comment likes. Milestones (streaks, goals hit) post automatically.
- **Challenges** — group-created challenges with a leaderboard.
- **Coach + Copilot** — a member can be promoted to "coach" for a group. The coach dashboard triages who needs attention; an AI ("Copilot," built on Claude) drafts a personalized check-in message from the member's real data, which the coach always edits/reviews before sending — AI text is never auto-posted in the coach's voice.
- **Weekly Review** — an auto-generated, story-style weekly recap.
- **Notifications** — in-app + web push, deep-linking back to the specific post/comment.
- **Onboarding** — goal, activity level, and diet-based calorie/macro target calculation.
- **Settings** — language (English / Latin American Spanish), notification preferences, privacy controls (data export, account deletion), subscription status (currently free for everyone — no monetization live yet).
- **Help Center** — bundled, localized help articles with in-app search.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase — Postgres with Row Level Security, Auth, Storage, and Realtime (used for live feed updates)
- **AI:** Anthropic Claude — photo-based food recognition, food-name nutrition estimation, and Copilot check-in drafting (`@anthropic-ai/sdk`)
- **Push notifications:** Web Push (`web-push`) + a service worker
- **Barcode scanning:** `@zxing`
- **Testing:** Vitest (unit) + Playwright (e2e)
- **i18n:** a hand-rolled, fully typed dictionary system (English + es-419), with compile-time parity enforced between locales
- **Deployment:** Vercel (serverless functions for all API routes — no separate backend server or edge functions)
- **PWA:** installable, standalone display, manifest + service worker (currently push-only, no offline caching)

Notably, this is a **pure web PWA** — no Capacitor/Expo/React Native, no native iOS/Android shell exists today.

## Architecture at a glance

- `app/` — Next.js App Router routes. Each major feature has a server component (`page.tsx`, does the data fetching) paired with a `*Client.tsx` component (interactivity), plus `app/api/**` for the ~34 backend routes (meal/water/activity/weight logging, search/barcode, coach/Copilot, push, cron jobs, account/data export).
- `components/` — shared UI: feed cards, activity cards, modals, the meal logger, barcode scanner, etc.
- `lib/` — domain logic, framework-agnostic where possible: nutrition math (`nutrients`, `macros`, `trends`, `fitness`), the Claude integration (`anthropic.ts`, `copilot.ts`, `copilot-ai.ts`, `coach-intel.ts`), rate limiting, i18n, USDA/Open Food Facts clients, streaks, challenges, and more.
- `supabase/migrations/` — the full schema history (50+ migrations), applied by hand through the Supabase SQL editor rather than an automated pipeline.
- `types/` — shared TypeScript types for the domain model (food logs, comments, notifications, etc.).

Data isolation is RLS-first: nearly every table scopes reads/writes to "you" or "people who share a group with you," enforced at the database level rather than in application code.

## Where to look for more

- `docs/PRODUCTION-READINESS-MASTER-AUDIT-2026-07-06.md` — the most comprehensive audit (architecture, security, performance, accessibility, testing, etc.), with a prioritized fix list.
- `docs/I18N.md` — how the translation system works.
- `docs/coach-copilot-spec.md` — the original design spec for the coach/Copilot feature.
- `docs/DEPLOYMENT.md` — how deploys and migrations work today.
