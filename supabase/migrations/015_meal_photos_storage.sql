-- ── Meal photo storage ───────────────────────────────────────────────────────
-- A public bucket for meal photos so they persist and are visible to the whole
-- group (previously photos were stored as local blob: URLs that broke on reload).

INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read (public bucket / public URLs)
DROP POLICY IF EXISTS "Public read meal photos" ON storage.objects;
CREATE POLICY "Public read meal photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'meal-photos');

-- Users can upload into their own folder (path = <user_id>/<file>)
DROP POLICY IF EXISTS "Users upload own meal photos" ON storage.objects;
CREATE POLICY "Users upload own meal photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own photos
DROP POLICY IF EXISTS "Users delete own meal photos" ON storage.objects;
CREATE POLICY "Users delete own meal photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
