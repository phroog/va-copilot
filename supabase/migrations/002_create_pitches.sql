CREATE TABLE pitches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  polished_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pitches"
  ON pitches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pitches"
  ON pitches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pitches"
  ON pitches FOR UPDATE
  USING (auth.uid() = user_id);
