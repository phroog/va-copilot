CREATE TABLE IF NOT EXISTS user_timezones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  label TEXT NOT NULL,
  timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_timezones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own timezones"
  ON user_timezones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own timezones"
  ON user_timezones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own timezones"
  ON user_timezones FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
