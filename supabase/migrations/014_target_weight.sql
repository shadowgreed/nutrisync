-- Target weight for the weight-goal progress tracker on the Trends page.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,2);
