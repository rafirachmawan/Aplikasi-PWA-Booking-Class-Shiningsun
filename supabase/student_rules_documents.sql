-- Tabel untuk dokumen Peraturan Siswa (PDF)
-- Admin mengunggah / mengganti PDF dari dashboard; dokumen terbaru ditampilkan di Portal Orang Tua.
CREATE TABLE IF NOT EXISTS public.student_rules_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_url TEXT NOT NULL, -- Link file PDF di Google Drive
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Index agar pengambilan dokumen terbaru selalu cepat
CREATE INDEX IF NOT EXISTS idx_student_rules_documents_uploaded_at ON public.student_rules_documents(uploaded_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.student_rules_documents ENABLE ROW LEVEL SECURITY;

-- Semua pihak (termasuk anon / Portal Orang Tua) boleh membaca
DROP POLICY IF EXISTS "Allow read student rules documents" ON public.student_rules_documents;
CREATE POLICY "Allow read student rules documents" ON public.student_rules_documents
    FOR SELECT TO anon, authenticated USING (true);

-- Hanya admin terautentikasi yang boleh mengunggah dokumen baru
DROP POLICY IF EXISTS "Allow authenticated insert student rules documents" ON public.student_rules_documents;
CREATE POLICY "Allow authenticated insert student rules documents" ON public.student_rules_documents
    FOR INSERT TO authenticated WITH CHECK (true);

-- Hanya admin terautentikasi yang boleh menghapus dokumen
DROP POLICY IF EXISTS "Allow authenticated delete student rules documents" ON public.student_rules_documents;
CREATE POLICY "Allow authenticated delete student rules documents" ON public.student_rules_documents
    FOR DELETE TO authenticated USING (true);

-- Hanya admin terautentikasi yang boleh mengubah nama dokumen
DROP POLICY IF EXISTS "Allow authenticated update student rules documents" ON public.student_rules_documents;
CREATE POLICY "Allow authenticated update student rules documents" ON public.student_rules_documents
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
