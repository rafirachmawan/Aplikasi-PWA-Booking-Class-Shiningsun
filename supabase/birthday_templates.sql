-- Create birthday_templates table (Global for all students and branches)
CREATE TABLE birthday_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  greeting_text TEXT NOT NULL, -- Single unified greeting text
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

-- Grant permissions
GRANT ALL PRIVILEGES ON birthday_templates TO postgres;
