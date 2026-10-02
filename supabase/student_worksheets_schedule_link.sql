-- ============================================================
-- Laporan Perkembangan: link ke jadwal (slot + jam) + cegah double
-- AMAN untuk data lama: semua kolom NULLABLE, tanpa hapus/ubah baris lama.
-- Baris lama (schedule_slot_id IS NULL AND schedule_time IS NULL)
-- TIDAK kena unique index (partial index di bawah pakai WHERE),
-- jadi migrasi tidak akan gagal walau data lama ada duplikat tanggal.
-- ============================================================

-- 1. Kolom baru (nullable, tidak mengganggu data lama)
ALTER TABLE public.student_worksheets
  ADD COLUMN IF NOT EXISTS schedule_slot_id UUID;

ALTER TABLE public.student_worksheets
  ADD COLUMN IF NOT EXISTS schedule_time TEXT;

-- 2. FK opsional ke slot jadwal (SET NULL agar hapus jadwal tidak hapus laporan)
--    Dibuat tanpa VALIDATE agar tidak mengunci tabel lama.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_worksheets_schedule_slot'
  ) THEN
    ALTER TABLE public.student_worksheets
      ADD CONSTRAINT fk_worksheets_schedule_slot
      FOREIGN KEY (schedule_slot_id)
      REFERENCES public.schedule_slots(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- 3. Index lookup cepat (tidak unik, aman untuk semua baris)
CREATE INDEX IF NOT EXISTS idx_worksheets_student_date_slot
  ON public.student_worksheets(student_id, worksheet_date, schedule_slot_id);

CREATE INDEX IF NOT EXISTS idx_worksheets_student_date_time
  ON public.student_worksheets(student_id, worksheet_date, schedule_time);

-- 4. Cegah double HANYA untuk baris baru yang punya konteks jadwal.
--    Partial index: baris lama (keduanya NULL) dikecualikan -> migrasi tidak gagal.
CREATE UNIQUE INDEX IF NOT EXISTS uq_worksheets_student_date_slot
  ON public.student_worksheets(student_id, worksheet_date, schedule_slot_id)
  WHERE schedule_slot_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_worksheets_student_date_time
  ON public.student_worksheets(student_id, worksheet_date, schedule_time)
  WHERE schedule_slot_id IS NULL AND schedule_time IS NOT NULL;

-- 5. Query bantu: cek duplikat data lama (READ-ONLY, untuk audit manual)
-- SELECT student_id, worksheet_date, COUNT(*)
-- FROM public.student_worksheets
-- WHERE schedule_slot_id IS NULL AND schedule_time IS NULL
-- GROUP BY student_id, worksheet_date HAVING COUNT(*) > 1;
