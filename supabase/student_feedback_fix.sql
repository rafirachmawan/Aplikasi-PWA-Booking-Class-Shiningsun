-- DROP ALL POLICIES FIRST
DROP POLICY IF EXISTS "Parents can submit feedback for their children" ON student_feedback;
DROP POLICY IF EXISTS "Parents can view their own feedback" ON student_feedback;
DROP POLICY IF EXISTS "Admins and Teachers can view student feedback" ON student_feedback;
DROP POLICY IF EXISTS "Superadmin can mark feedback as read" ON student_feedback;

-- DISABLE RLS TEMPORARILY TO ALLOW INSERT
ALTER TABLE student_feedback DISABLE ROW LEVEL SECURITY;

-- NOW ENABLE WITH EMPTY CHECK (allow anyone)
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

-- CREATE NEW POLICIES WITH CORRECT SYNTAX
CREATE POLICY "allow_anyone_insert_for_parents"
  ON student_feedback
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "parents_view_own_only"
  ON student_feedback
  FOR SELECT
  USING (auth.uid() = parent_user_id);

CREATE POLICY "authenticated_users_view_all"
  ON student_feedback
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_users_can_update"
  ON student_feedback
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RE-ENABLE RLS AFTER POLICIES CREATED
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;

-- TEST QUERY TO VERIFY
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'student_feedback';
