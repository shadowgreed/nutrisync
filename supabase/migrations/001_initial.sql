-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'New User',
  avatar_url   TEXT,
  privacy_mode TEXT NOT NULL DEFAULT 'summary'
    CHECK (privacy_mode IN ('meal_photos', 'summary', 'full', 'dark')),
  dark_mode_until TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Groups
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 8),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Group membership
CREATE TABLE group_members (
  group_id  UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- RLS for groups (now group_members exists)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their groups" ON groups FOR SELECT
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated users can create groups" ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group membership" ON group_members FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can join groups" ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Food logs
CREATE TABLE food_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type        TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  logged_at        TIMESTAMPTZ DEFAULT NOW(),
  photo_url        TEXT,
  foods            JSONB NOT NULL DEFAULT '[]',
  nutrient_totals  JSONB NOT NULL DEFAULT '{}',
  privacy_override TEXT CHECK (privacy_override IN ('meal_photos','summary','full','dark'))
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view logs from their group members" ON food_logs FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT user_id FROM group_members
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Users can insert own logs" ON food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON food_logs FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON food_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Reactions
CREATE TABLE reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  food_log_id  UUID REFERENCES food_logs(id) ON DELETE CASCADE,
  emoji        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, food_log_id)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in group can view reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Users can add own reactions" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON reactions FOR UPDATE USING (auth.uid() = user_id);

-- Comments
CREATE TABLE comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  food_log_id  UUID REFERENCES food_logs(id) ON DELETE CASCADE,
  text         TEXT NOT NULL CHECK (char_length(text) <= 280),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in group can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can add own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for the group feed
ALTER PUBLICATION supabase_realtime ADD TABLE food_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
