CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  meeting_link TEXT,
  calendly_link TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  pitch_id UUID REFERENCES pitches(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events"
  ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events"
  ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events"
  ON events FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
