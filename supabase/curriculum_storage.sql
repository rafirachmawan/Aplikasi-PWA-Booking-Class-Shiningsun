-- Bucket Supabase Storage untuk dokumen Kurikulum (PDF)
-- Upload langsung dari browser (melewati batas body 4.5 MB serverless Vercel).
-- Baca: publik (link hanya dibagikan di dashboard admin); tulis: authenticated (superadmin dipaksakan di server action).
INSERT INTO storage.buckets (id, name, public)
VALUES ('kurikulum', 'kurikulum', true)
ON CONFLICT (id) DO NOTHING;

-- Baca objek di bucket kurikulum (untuk tombol Lihat PDF)
DROP POLICY IF EXISTS "Kurikulum public read" ON storage.objects;
CREATE POLICY "Kurikulum public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'kurikulum');

-- Upload hanya untuk admin terautentikasi
DROP POLICY IF EXISTS "Kurikulum authenticated insert" ON storage.objects;
CREATE POLICY "Kurikulum authenticated insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kurikulum');

-- Update hanya untuk admin terautentikasi
DROP POLICY IF EXISTS "Kurikulum authenticated update" ON storage.objects;
CREATE POLICY "Kurikulum authenticated update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'kurikulum');

-- Hapus hanya untuk admin terautentikasi
DROP POLICY IF EXISTS "Kurikulum authenticated delete" ON storage.objects;
CREATE POLICY "Kurikulum authenticated delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'kurikulum');
