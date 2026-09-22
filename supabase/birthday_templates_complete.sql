-- Drop existing table if exists to start fresh
DROP TABLE IF EXISTS birthday_templates CASCADE;

-- Create new birthday_templates table with correct structure
CREATE TABLE birthday_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  greeting_text TEXT NOT NULL,
  motivational_quote TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default template
INSERT INTO birthday_templates (title, greeting_text, motivational_quote, is_active)
VALUES (
  'Template Standar',
  '🎉 Selamat Ulang Tahun yang ke-{age} tahun, {name}! Semoga makin hebat dan ceria selalu ya! 🎈',
  '"Setiap bertambah usia adalah kesempatan baru untuk tumbuh, belajar, dan menjadi lebih baik. Teruslah bermimpi besar dan berjuang mewujudkan impianmu! 🌟"',
  true
);

-- Disable RLS for this table (since it's a global system template)
ALTER TABLE birthday_templates DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to postgres role
GRANT ALL PRIVILEGES ON TABLE birthday_templates TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- If you want to enable RLS in future, use these policies instead:
/*
-- Allow any authenticated user to read templates
CREATE POLICY "Allow reading birthday templates" ON birthday_templates
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

-- Allow only authenticated users to insert templates
CREATE POLICY "Allow inserting birthday templates" ON birthday_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update templates
CREATE POLICY "Allow updating birthday templates" ON birthday_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete templates
CREATE POLICY "Allow deleting birthday templates" ON birthday_templates
  FOR DELETE USING (auth.role() = 'authenticated');
*/

SELECT 'birthday_templates table created successfully with correct RLS settings';
