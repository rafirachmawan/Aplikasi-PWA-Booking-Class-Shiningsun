-- Add photo_url column to students table for profile photo
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- Create storage bucket for student photos (run in Supabase dashboard SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);

-- Storage policy: allow public read
-- CREATE POLICY "Public read student photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');

-- Storage policy: allow anyone with anon key to upload (authenticated or anon)
-- CREATE POLICY "Allow upload student photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');

-- Storage policy: allow update/overwrite
-- CREATE POLICY "Allow update student photos" ON storage.objects FOR UPDATE USING (bucket_id = 'student-photos');
