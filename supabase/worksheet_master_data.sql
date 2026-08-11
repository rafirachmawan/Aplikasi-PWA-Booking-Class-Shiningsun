-- =========================================
-- SQL Migration: Tabel Teachers & Assessment Templates
-- Eksekusi file ini di Supabase SQL Editor
-- =========================================

-- 1. Table: teachers (Daftar Guru / Miss per Cabang)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: assessment_templates (Template Penilaian Siswa per Cabang & Kategori)
CREATE TABLE IF NOT EXISTS assessment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'kegiatan', -- 'kegiatan', 'pemahaman', 'rumah', 'afirmasi'
    title VARCHAR(250) NOT NULL,
    materi TEXT,
    kegiatan TEXT,
    hasil_belajar TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration safety for existing tables
ALTER TABLE assessment_templates ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'kegiatan';
ALTER TABLE assessment_templates ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_teachers_branch ON teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_templates_branch ON assessment_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON assessment_templates(category);
