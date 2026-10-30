-- ============================================================
-- SHININGSUN MASTER SCHEMA FOR NEW SUPABASE PROJECT
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: branches
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: users (Public profile)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'BRANCH_ADMIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'BRANCH_ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: labels (Level siswa)
CREATE TABLE IF NOT EXISTS public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    main_level VARCHAR(100) NOT NULL,
    sub_level VARCHAR(50) NOT NULL,
    hex_color VARCHAR(7) NOT NULL,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    max_quota INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table: teachers
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table: assessment_templates
CREATE TABLE IF NOT EXISTS public.assessment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    label_id UUID REFERENCES public.labels(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'kegiatan',
    title VARCHAR(250) NOT NULL,
    materi TEXT,
    kegiatan TEXT,
    hasil_belajar TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table: students
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
    CREATE TYPE student_status AS ENUM ('CG', 'REGISTERED', 'INACTIVE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    label_id UUID REFERENCES public.labels(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    nickname VARCHAR(100),
    gender VARCHAR(20),
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    school VARCHAR(150),
    status student_status NOT NULL DEFAULT 'CG',
    registration_date DATE NOT NULL,
    registered_at DATE,
    photo_url TEXT DEFAULT NULL,
    access_pin VARCHAR(10) DEFAULT '123456',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Table: schedule_slots
CREATE TABLE IF NOT EXISTS public.schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table: schedule_student
CREATE TABLE IF NOT EXISTS public.schedule_student (
    schedule_slot_id UUID NOT NULL REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (schedule_slot_id, student_id)
);

-- 10. Table: student_worksheets
CREATE TABLE IF NOT EXISTS public.student_worksheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    worksheet_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gdrive_link TEXT,
    materi TEXT,
    kegiatan TEXT,
    hasil_belajar TEXT,
    catatan_guru TEXT,
    catatan_ortu TEXT,
    rekomendasi_rumah TEXT,
    ttd_guru VARCHAR(100),
    bulan_ke INTEGER,
    schedule_slot_id UUID REFERENCES public.schedule_slots(id) ON DELETE SET NULL,
    schedule_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Table: student_point_redemptions
CREATE TABLE IF NOT EXISTS public.student_point_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    points_deducted INTEGER NOT NULL,
    reward_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Table: student_feedback
CREATE TABLE IF NOT EXISTS public.student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    parent_user_id UUID NOT NULL,
    message TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    CONSTRAINT valid_message_length CHECK (char_length(message) <= 500)
);

-- 13. Table: birthday_templates
CREATE TABLE IF NOT EXISTS public.birthday_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    greeting_text TEXT NOT NULL,
    motivational_quote TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Table: curriculum_documents
CREATE TABLE IF NOT EXISTS public.curriculum_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 15. Table: student_rules_documents
CREATE TABLE IF NOT EXISTS public.student_rules_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 16. Table: push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    branch_id TEXT DEFAULT 'ALL',
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Table: system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_schedule_lookup ON public.schedule_slots (branch_id, date, class_id);
CREATE INDEX IF NOT EXISTS idx_student_branch ON public.students (branch_id, status);
CREATE INDEX IF NOT EXISTS idx_student_registered ON public.students (branch_id, status, registered_at);
CREATE INDEX IF NOT EXISTS idx_teachers_branch ON public.teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_templates_branch ON public.assessment_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_label ON public.assessment_templates(label_id);
CREATE INDEX IF NOT EXISTS idx_student_worksheets_student ON public.student_worksheets(student_id);
CREATE INDEX IF NOT EXISTS idx_student_worksheets_date ON public.student_worksheets(worksheet_date);
CREATE INDEX IF NOT EXISTS idx_student_worksheets_branch ON public.student_worksheets(branch_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_student_date_slot ON public.student_worksheets(student_id, worksheet_date, schedule_slot_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_student_date_time ON public.student_worksheets(student_id, worksheet_date, schedule_time);
CREATE UNIQUE INDEX IF NOT EXISTS uq_worksheets_student_date_slot ON public.student_worksheets(student_id, worksheet_date, schedule_slot_id) WHERE schedule_slot_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_worksheets_student_date_time ON public.student_worksheets(student_id, worksheet_date, schedule_time) WHERE schedule_slot_id IS NULL AND schedule_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_point_redemptions_student ON public.student_point_redemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_point_redemptions_branch ON public.student_point_redemptions(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_student_id ON public.student_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_parent_id ON public.student_feedback(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_submitted_at ON public.student_feedback(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculum_documents_uploaded_at ON public.curriculum_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_rules_documents_uploaded_at ON public.student_rules_documents(uploaded_at DESC);

-- ============================================================
-- STORAGE BUCKETS (FOR DOCUMENTS / PHOTOS)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('curriculum-docs', 'curriculum-docs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

