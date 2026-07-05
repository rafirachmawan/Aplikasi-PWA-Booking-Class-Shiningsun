-- Jalankan script ini di SQL Editor Supabase Anda untuk menambahkan kolom baru
-- tanpa menghapus data siswa yang sudah ada.

ALTER TABLE students
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS school VARCHAR(150);
