CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat messages"
  ON chat_messages FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime for chat_messages (requires manual step in Supabase dashboard too)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
