-- =========================================
-- ShiningSun Booking Class - Supabase Schema
-- =========================================

-- 1. Table: branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: users
-- Menggunakan Enum bawaan Postgres untuk Role
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'BRANCH_ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT, -- Nullable untuk Superadmin
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'BRANCH_ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: labels
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = System Default
    main_level VARCHAR(100) NOT NULL,
    sub_level VARCHAR(50) NOT NULL,
    hex_color VARCHAR(7) NOT NULL,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    max_quota INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table: students
CREATE TYPE student_status AS ENUM ('CG', 'REGISTERED');

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    label_id UUID REFERENCES labels(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    status student_status NOT NULL DEFAULT 'CG',
    registration_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table: schedule_slots
CREATE TABLE schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Pivot Table: schedule_student
CREATE TABLE schedule_student (
    schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (schedule_slot_id, student_id)
);

-- =========================================
-- INDEXING UNTUK OPTIMASI QUERY MATRIKS
-- =========================================
CREATE INDEX idx_schedule_lookup ON schedule_slots (branch_id, date, class_id);
CREATE INDEX idx_student_branch ON students (branch_id, status);

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- (Opsional: Diaktifkan nanti untuk keamanan berlapis)
-- =========================================
-- ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
