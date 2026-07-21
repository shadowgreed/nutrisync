-- 055_food_unit_preference.sql
-- Account-level preference for how food serving sizes/portions are shown and
-- entered: grams (the app's canonical storage unit, FoodEntry.servingSizeG)
-- or ounces. Set in Settings -> Edit Profile; read wherever a food's weight
-- is displayed or typed (MealLogger, FoodSearchBar, QuickLogSuggestions,
-- MacroDetailModal). Does NOT affect macro totals (protein/carbs/fat/fiber
-- grams) — those stay in grams everywhere, matching the universal
-- nutrition-facts convention, same as every other food-logging app.
-- Idempotent; safe to re-run. Apply via the Supabase SQL editor.
-- NOTE: rename to the next free number if another migration lands first.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_unit TEXT NOT NULL DEFAULT 'g';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_food_unit_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_food_unit_check
  CHECK (food_unit IN ('g', 'oz'));
