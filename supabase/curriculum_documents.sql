-- Tabel untuk dokumen Kurikulum (PDF)
-- Upload khusus SUPERADMIN (dipaksakan di server action); yang bisa melihat hanya admin (authenticated).
-- Tidak ditampilkan di Portal Orang Tua.
CREATE TABLE IF NOT EXISTS public.curriculum_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_url TEXT NOT NULL, -- Link file PDF di Google Drive
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Index agar pengambilan dokumen terbaru selalu cepat
CREATE INDEX IF NOT EXISTS idx_curriculum_documents_uploaded_at ON public.curriculum_documents(uploaded_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.curriculum_documents ENABLE ROW LEVEL SECURITY;

-- Hanya admin terautentikasi (superadmin / branch admin) yang boleh membaca.
-- Portal Orang Tua (anon) TIDAK bisa melihat.
DROP POLICY IF EXISTS "Allow authenticated read curriculum documents" ON public.curriculum_documents;
CREATE POLICY "Allow authenticated read curriculum documents" ON public.curriculum_documents
    FOR SELECT TO authenticated USING (true);

-- Insert hanya authenticated (pembatasan superadmin dipaksakan di layer aplikasi / server action)
DROP POLICY IF EXISTS "Allow authenticated insert curriculum documents" ON public.curriculum_documents;
CREATE POLICY "Allow authenticated insert curriculum documents" ON public.curriculum_documents
    FOR INSERT TO authenticated WITH CHECK (true);

-- Delete hanya authenticated (pembatasan superadmin di layer aplikasi)
DROP POLICY IF EXISTS "Allow authenticated delete curriculum documents" ON public.curriculum_documents;
CREATE POLICY "Allow authenticated delete curriculum documents" ON public.curriculum_documents
    FOR DELETE TO authenticated USING (true);

-- Update hanya authenticated (pembatasan superadmin di layer aplikasi)
DROP POLICY IF EXISTS "Allow authenticated update curriculum documents" ON public.curriculum_documents;
CREATE POLICY "Allow authenticated update curriculum documents" ON public.curriculum_documents
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
