-- Migration Script for PWA Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  branch_id TEXT DEFAULT 'ALL',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow insert, select, and delete for push subscriptions
DROP POLICY IF EXISTS "Allow all for push_subscriptions" ON push_subscriptions;
CREATE POLICY "Allow all for push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);
