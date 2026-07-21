-- Add inbox_email_alias to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inbox_email_alias TEXT;

-- Inbox messages table
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false,
  platform TEXT DEFAULT ''
);

ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inbox messages"
  ON inbox_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inbox messages"
  ON inbox_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inbox messages"
  ON inbox_messages FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to insert for any user (webhook)
CREATE POLICY "Service role can insert any inbox message"
  ON inbox_messages FOR INSERT
  WITH CHECK (true);
