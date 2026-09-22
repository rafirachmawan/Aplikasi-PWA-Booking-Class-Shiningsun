-- DROP TABLE and recreate to ensure clean state
DROP TABLE IF EXISTS student_feedback CASCADE;

-- CREATE NEW TABLE WITHOUT FOREIGN KEY CONSTRAINT
CREATE TABLE student_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL,  -- Can be ANY uuid (from auth.users or students table)
  message TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Constraints
  CONSTRAINT valid_message_length CHECK (char_length(message) <= 500),
  CONSTRAINT unique_submission CHECK (submitted_at IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_student_feedback_student_id ON student_feedback(student_id);
CREATE INDEX idx_student_feedback_parent_id ON student_feedback(parent_user_id);
CREATE INDEX idx_student_feedback_submitted_at ON student_feedback(submitted_at DESC);
CREATE INDEX idx_student_feedback_is_read ON student_feedback(is_read);

-- Enable Row Level Security
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "allow_anyone_insert" ON student_feedback;
CREATE POLICY "allow_anyone_insert"
  ON student_feedback
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "parents_view_own_only" ON student_feedback;
CREATE POLICY "parents_view_own_only"
  ON student_feedback
  FOR SELECT
  USING (auth.uid() = parent_user_id);

DROP POLICY IF EXISTS "authenticated_users_view_all" ON student_feedback;
CREATE POLICY "authenticated_users_view_all"
  ON student_feedback
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_users_can_update" ON student_feedback;
CREATE POLICY "authenticated_users_can_update"
  ON student_feedback
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'student_feedback';
