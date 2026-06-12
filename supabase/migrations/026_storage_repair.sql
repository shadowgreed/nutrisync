-- ── Storage repair: buckets + policies in one idempotent pass ────────────────
-- Symptoms this fixes: meal photos 403ing in the feed (bucket private or missing
-- its public-read policy) and uploads failing with "new row violates row-level
-- security policy" (missing INSERT policy). Safe to run repeatedly. Supersedes
-- the storage parts of migrations 015 / 019 / 024.

-- 1. Ensure all three buckets exist AND are public.
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('group-photos', 'group-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public read on all three (public URLs need this even with public=true
--    when RLS is enabled on storage.objects).
DROP POLICY IF EXISTS "Public read meal photos" ON storage.objects;
CREATE POLICY "Public read meal photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'meal-photos');

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public read group photos" ON storage.objects;
CREATE POLICY "Public read group photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'group-photos');

-- 3. Authenticated users write into their OWN folder (path = <user_id>/<file>).
DROP POLICY IF EXISTS "Users upload own meal photos" ON storage.objects;
CREATE POLICY "Users upload own meal photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own meal photos" ON storage.objects;
CREATE POLICY "Users delete own meal photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Belt-and-suspenders: make sure the groups founder-update policy from
--    migration 022 exists (its absence makes photo/name saves silently no-op).
DROP POLICY IF EXISTS "Founder can update group" ON groups;
CREATE POLICY "Founder can update group" ON groups FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
