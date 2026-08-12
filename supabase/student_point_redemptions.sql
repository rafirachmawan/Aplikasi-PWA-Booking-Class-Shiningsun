-- Create table for Student Point Redemptions (Tukar Hadiah / Potong Poin Siswa)
CREATE TABLE IF NOT EXISTS public.student_point_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    points_deducted INTEGER NOT NULL,
    reward_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing untuk performa pencarian histori penukaran
CREATE INDEX IF NOT EXISTS idx_student_point_redemptions_student ON public.student_point_redemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_point_redemptions_branch ON public.student_point_redemptions(branch_id);
