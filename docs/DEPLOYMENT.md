# NutriSync — Deployment Runbook

Production deploys from **`main`** via Vercel's Git integration: every merge to
`main` triggers a production build automatically. There is no manual step in
the normal path.

## When the live site seems stale

Symptoms: a merged feature isn't visible (this has happened twice — the a11y
merge and the Spanish i18n merge).

1. **Confirm what production is running.** Vercel → Deployments → the newest
   deployment marked **Production**. Its commit sha must match `main`'s HEAD
   (`git log --oneline -1`).
2. **Failed builds pin production to the last green deploy.** If newer
   deployments show red, open the build log — production stays on the old
   build until a green one lands, silently accumulating missing features.
3. **Check Settings → Git**: Production Branch = `main`, auto-deploy enabled,
   and no old deployment manually promoted/pinned to production.
4. **Force a rebuild:** Deployments → ⋯ on the latest → **Redeploy** (uncheck
   "Use existing Build Cache"), or merge any PR to `main`.

## Quick probes against the live site

- `https://<domain>/settings/language` → 404 means the deploy predates the
  i18n merge (`eba127d`).
- View source → `<html lang="...">` should be `en` / `es-419`, not a
  hardcoded `en` (predates i18n).
- The login page should show the English | Español picker when logged out.

## After a deploy lands

- Installed-PWA users: a plain refresh / reopen is enough — the service worker
  does not cache pages (push-only).
- Check any ⚠️ "migration to apply" note on recently merged PRs — DB
  migrations are applied manually in the Supabase SQL editor and features can
  silently no-op without them (e.g. 049 water-goal, 050 rate-limit,
  051 language).

## Applied-migration ledger

Keep `supabase/migrations/` and the live DB in sync; as of this writing the
repo contains migrations through **055**. Confirmed applied during the
2026-07 sessions: 052 (notification activity link) and 053 (P0 security
fixes). **054 (group re-join fix) and 055 (food_unit preference) still need
applying** unless done since — check with:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'food_unit';  -- 055
SELECT policyname, with_check FROM pg_policies
WHERE tablename = 'group_members' AND policyname = 'Users can join groups';
-- 054 applied when with_check no longer references group_join_requests
```

(The food-unit feature degrades gracefully without 055 — the preference is
mirrored in a device cookie via `/api/food-unit` — but the account-level,
cross-device copy only works once the column exists.)
