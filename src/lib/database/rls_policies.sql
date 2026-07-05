-- =========================================
-- ShiningSun Booking Class - RLS Policies (Idempotent)
-- =========================================
-- Menghapus policy lama agar tidak terjadi bentrok (Error 42710) saat dijalankan ulang
-- lalu membuat ulang kebijakan akses yang diperlukan.

-- 1. Cabang
DROP POLICY IF EXISTS "Allow public read for branches" ON branches;
CREATE POLICY "Allow public read for branches" ON branches FOR SELECT USING (true);

-- 2. Master Kelas
DROP POLICY IF EXISTS "Allow public read for classes" ON classes;
DROP POLICY IF EXISTS "Allow public insert for classes" ON classes;
DROP POLICY IF EXISTS "Allow public delete for classes" ON classes;
CREATE POLICY "Allow public read for classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public insert for classes" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for classes" ON classes FOR DELETE USING (true);

-- 3. Label / Level
DROP POLICY IF EXISTS "Allow public read for labels" ON labels;
DROP POLICY IF EXISTS "Allow public insert for labels" ON labels;
DROP POLICY IF EXISTS "Allow public delete for labels" ON labels;
CREATE POLICY "Allow public read for labels" ON labels FOR SELECT USING (true);
CREATE POLICY "Allow public insert for labels" ON labels FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for labels" ON labels FOR DELETE USING (true);

-- 4. Siswa
DROP POLICY IF EXISTS "Allow public read for students" ON students;
DROP POLICY IF EXISTS "Allow public insert for students" ON students;
DROP POLICY IF EXISTS "Allow public update for students" ON students;
DROP POLICY IF EXISTS "Allow public delete for students" ON students;
CREATE POLICY "Allow public read for students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert for students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for students" ON students FOR DELETE USING (true);

-- 5. Jadwal Slot
DROP POLICY IF EXISTS "Allow public read for schedule_slots" ON schedule_slots;
DROP POLICY IF EXISTS "Allow public insert for schedule_slots" ON schedule_slots;
DROP POLICY IF EXISTS "Allow public update for schedule_slots" ON schedule_slots;
DROP POLICY IF EXISTS "Allow public delete for schedule_slots" ON schedule_slots;
CREATE POLICY "Allow public read for schedule_slots" ON schedule_slots FOR SELECT USING (true);
CREATE POLICY "Allow public insert for schedule_slots" ON schedule_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for schedule_slots" ON schedule_slots FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for schedule_slots" ON schedule_slots FOR DELETE USING (true);

-- 6. Booking Siswa (Schedule Student)
DROP POLICY IF EXISTS "Allow public read for schedule_student" ON schedule_student;
DROP POLICY IF EXISTS "Allow public insert for schedule_student" ON schedule_student;
DROP POLICY IF EXISTS "Allow public delete for schedule_student" ON schedule_student;
CREATE POLICY "Allow public read for schedule_student" ON schedule_student FOR SELECT USING (true);
CREATE POLICY "Allow public insert for schedule_student" ON schedule_student FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for schedule_student" ON schedule_student FOR DELETE USING (true);
