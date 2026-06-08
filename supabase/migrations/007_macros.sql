-- ── Macronutrient tracking ───────────────────────────────────────────────────
-- A proper nutrition app tracks protein / carbs / fat / fiber alongside calories.
-- Stored as a JSONB object on each food log, mirroring nutrient_totals.

ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS macro_totals JSONB NOT NULL DEFAULT '{}';

-- Optional: per-user macro target overrides (otherwise derived from calorie_target)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protein_target_g INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS carbs_target_g   INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fat_target_g     INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fiber_target_g   INT;
