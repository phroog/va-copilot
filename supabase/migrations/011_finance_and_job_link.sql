-- Add job_id to time_entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id);

-- Income log table for finance tracking
CREATE TABLE IF NOT EXISTS income_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('time', 'job', 'manual')),
  time_entry_id UUID REFERENCES time_entries(id),
  pitch_id UUID REFERENCES pitches(id),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT DEFAULT '',
  earned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE income_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income"
  ON income_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income"
  ON income_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own income"
  ON income_log FOR DELETE USING (auth.uid() = user_id);
