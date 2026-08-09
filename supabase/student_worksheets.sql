-- Create table for Lembar Kerja Siswa (Student Worksheets)
CREATE TABLE IF NOT EXISTS public.student_worksheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- Contoh: "Lembar Kerja - Modul 1 Montessori"
    description TEXT, -- Catatan perkembangan / evaluasi guru
    worksheet_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gdrive_link TEXT, -- Link file Google Drive (URL)
    materi TEXT, -- Materi yang diajarkan
    kegiatan TEXT, -- Kegiatan yang dilakukan
    hasil_belajar TEXT, -- Hasil belajar siswa
    catatan_guru TEXT, -- Catatan khusus dari guru ke siswa/orang tua
    catatan_ortu TEXT, -- Saran / masukan / tanggapan dari orang tua
    ttd_guru VARCHAR(100), -- Nama guru / tanda tangan digital
    bulan_ke INTEGER, -- Bulan ke berapa (1-12)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing untuk pencarian cepat berdasarkan siswa & tanggal
CREATE INDEX IF NOT EXISTS idx_student_worksheets_student ON public.student_worksheets(student_id);
CREATE INDEX IF NOT EXISTS idx_student_worksheets_date ON public.student_worksheets(worksheet_date);
CREATE INDEX IF NOT EXISTS idx_student_worksheets_branch ON public.student_worksheets(branch_id);

-- Tambahan kolom PIN / Kode Akses pada tabel students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS access_pin VARCHAR(10) DEFAULT '123456';

-- ============================================
-- MIGRASI: Jalankan query di bawah ini jika tabel sudah ada sebelumnya
-- untuk menambahkan kolom-kolom baru ke tabel yang sudah berjalan.
-- ============================================
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS materi TEXT;
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS kegiatan TEXT;
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS hasil_belajar TEXT;
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS catatan_guru TEXT;
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS catatan_ortu TEXT;
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS ttd_guru VARCHAR(100);
ALTER TABLE public.student_worksheets ADD COLUMN IF NOT EXISTS bulan_ke INTEGER;
