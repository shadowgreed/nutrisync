-- Add fitness fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg        NUMERIC(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm        NUMERIC(5,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year       INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS biological_sex   TEXT CHECK (biological_sex IN ('male','female','prefer_not_to_say'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal             TEXT CHECK (goal IN ('lose_weight','maintain','build_muscle','improve_health'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level   TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')) DEFAULT 'moderate';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calorie_target   INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_done  BOOLEAN DEFAULT FALSE;

-- Activity / exercise logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_name    TEXT NOT NULL,
  duration_minutes INT  NOT NULL,
  calories_burned  NUMERIC(7,1) NOT NULL DEFAULT 0,
  logged_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own activity logs" ON activity_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime for activity feed (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
