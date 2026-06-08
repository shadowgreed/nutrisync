-- Add total_calories to food_logs (calorie balance tracking)
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS total_calories INT NOT NULL DEFAULT 0;
