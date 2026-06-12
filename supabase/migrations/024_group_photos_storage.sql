-- ── Group cover photo storage ────────────────────────────────────────────────
-- Public bucket; only a group's founder can write to that group's folder
-- (path = <group_id>/<file>).

INSERT INTO storage.buckets (id, name, public)
VALUES ('group-photos', 'group-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read group photos" ON storage.objects;
CREATE POLICY "Public read group photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'group-photos');

DROP POLICY IF EXISTS "Founder upload group photo" ON storage.objects;
CREATE POLICY "Founder upload group photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-photos'
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id::text = (storage.foldername(name))[1] AND g.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Founder update group photo" ON storage.objects;
CREATE POLICY "Founder update group photo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'group-photos'
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id::text = (storage.foldername(name))[1] AND g.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Founder delete group photo" ON storage.objects;
CREATE POLICY "Founder delete group photo" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'group-photos'
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id::text = (storage.foldername(name))[1] AND g.created_by = auth.uid())
  );
