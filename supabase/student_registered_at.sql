-- Migrasi: tandai kapan siswa menjadi REGISTERED agar periode CG tidak masuk Laporan Terlewat.
-- Hanya ubah skema, tidak menambah / mengubah data apapun.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registered_at DATE;
CREATE INDEX IF NOT EXISTS idx_student_registered ON public.students (branch_id, status, registered_at);
