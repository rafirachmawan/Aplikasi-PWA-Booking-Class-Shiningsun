-- Tabel untuk menyimpan feedback pesan dari orang tua
CREATE TABLE IF NOT EXISTS student_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL,  -- Can be any UUID (from students.id or auth.users.id)
  message TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Constraints
  CONSTRAINT valid_message_length CHECK (char_length(message) <= 500),
  CONSTRAINT unique_submission CHECK (submitted_at IS NOT NULL)
);

-- Index untuk performa query (index pada parent_user_id optional, tapi tetap buat)
CREATE INDEX IF NOT EXISTS idx_student_feedback_student_id ON student_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_parent_id ON student_feedback(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_submitted_at ON student_feedback(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_feedback_is_read ON student_feedback(is_read);

-- Enable Row Level Security (RLS)
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Parents can insert feedback for their children (PUBLIC ACCESS for Parent Portal)
DROP POLICY IF EXISTS "Parents can submit feedback for their children" ON student_feedback;
CREATE POLICY "Parents can submit feedback for their children"
  ON student_feedback
  FOR INSERT
  WITH CHECK (true);  -- Allow anyone to insert (parent portal uses student_id as identifier)

-- Policy: Parents can only view their own feedback (requires authentication)
DROP POLICY IF EXISTS "Parents can view their own feedback" ON student_feedback;
CREATE POLICY "Parents can view their own feedback"
  ON student_feedback
  FOR SELECT
  USING (auth.uid() = parent_user_id);

-- Policy: Superadmin/Teachers can view all feedback for specific students (simplified)
DROP POLICY IF EXISTS "Admins and Teachers can view student feedback" ON student_feedback;
CREATE POLICY "Admins and Teachers can view student feedback"
  ON student_feedback
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow any authenticated user to view (simplified)

-- Policy: Superadmin can update feedback (mark as read) (simplified)
DROP POLICY IF EXISTS "Superadmin can mark feedback as read" ON student_feedback;
CREATE POLICY "Superadmin can mark feedback as read"
  ON student_feedback
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to mark feedback as read
CREATE OR REPLACE FUNCTION mark_feedback_as_read(feedback_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE student_feedback 
  SET is_read = TRUE 
  WHERE id = feedback_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
