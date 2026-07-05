-- =========================================
-- ShiningSun Booking Class - Dummy Data Seeder
-- =========================================

-- 1. Buat Cabang
INSERT INTO branches (id, name, address, is_active)
VALUES 
('11111111-1111-1111-1111-111111111111', 'ShiningSun Surabaya Pusat', 'Jl. Contoh Alamat No 123, Surabaya', true),
('33333333-3333-3333-3333-333333333333', 'ShiningSun Ngunut', 'Ngunut', true),
('44444444-4444-4444-4444-444444444444', 'ShiningSun Balesono', 'Balesono', true),
('55555555-5555-5555-5555-555555555555', 'ShiningSun Gragalan', 'Gragalan', true);

-- 2. Buat Admin Cabang (Sekadar data profil untuk direlasikan dengan auth.users)
INSERT INTO users (id, branch_id, name, email, password, role)
VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Admin Pusat', 'pusat@shiningsun.com', 'hashed_password_placeholder', 'BRANCH_ADMIN'),
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Admin Ngunut', 'ngunut@shiningsun.com', 'hashed_password_placeholder', 'BRANCH_ADMIN'),
('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Admin Balesono', 'balesono@shiningsun.com', 'hashed_password_placeholder', 'BRANCH_ADMIN'),
('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'Admin Gragalan', 'gragalan@shiningsun.com', 'hashed_password_placeholder', 'BRANCH_ADMIN');

-- 3. Masukkan 15 Label / Level Bawaan Pusat (is_system_default = true, branch_id = null)
INSERT INTO labels (main_level, sub_level, hex_color, is_system_default, branch_id) VALUES
('Montessori A', 'Merah', '#ef4444', true, null),
('Montessori A', 'Kuning', '#eab308', true, null),
('Montessori A', 'Hijau', '#22c55e', true, null),
('Montessori B', 'Biru', '#3b82f6', true, null),
('Montessori B', 'Ungu', '#a855f7', true, null),
('Montessori B', 'Pink', '#ec4899', true, null),
('Level 1', 'Oranye', '#f97316', true, null),
('Level 1', 'Cyan', '#06b6d4', true, null),
('Level 1', 'Lime', '#84cc16', true, null),
('Level 2', 'Teal', '#14b8a6', true, null),
('Level 2', 'Rose', '#f43f5e', true, null),
('Level 2', 'Indigo', '#6366f1', true, null),
('Level 3', 'Cokelat', '#a16207', true, null),
('Level 3', 'Abu-abu', '#64748b', true, null),
('Level 3', 'Hitam', '#0f172a', true, null);

-- 4. Buat Kelas Dummy untuk Cabang 1
INSERT INTO classes (id, branch_id, name, max_quota) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kelas Star', 4),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Kelas Sun', 4);
