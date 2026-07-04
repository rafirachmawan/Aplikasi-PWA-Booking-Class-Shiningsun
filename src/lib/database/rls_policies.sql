-- =========================================
-- ShiningSun Booking Class - RLS Policies
-- =========================================
-- Menambahkan kebijakan baca (Read/Select) agar frontend bisa mengambil data.

-- 1. Cabang (Bisa dibaca oleh siapa saja untuk MVP)
CREATE POLICY "Allow public read for branches" ON branches FOR SELECT USING (true);

-- 2. Master Kelas
CREATE POLICY "Allow public read for classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public insert for classes" ON classes FOR INSERT WITH CHECK (true);

-- 3. Label / Level
CREATE POLICY "Allow public read for labels" ON labels FOR SELECT USING (true);
CREATE POLICY "Allow public insert for labels" ON labels FOR INSERT WITH CHECK (true);

-- 4. Siswa
CREATE POLICY "Allow public read for students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert for students" ON students FOR INSERT WITH CHECK (true);

-- 5. Jadwal
CREATE POLICY "Allow public read for schedule_slots" ON schedule_slots FOR SELECT USING (true);
CREATE POLICY "Allow public insert for schedule_slots" ON schedule_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read for schedule_student" ON schedule_student FOR SELECT USING (true);
