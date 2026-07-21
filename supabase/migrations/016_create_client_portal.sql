-- Client waitlist
CREATE TABLE IF NOT EXISTS client_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert into waitlist"
  ON client_waitlist FOR INSERT WITH CHECK (true);

-- Client access tokens
CREATE TABLE IF NOT EXISTS client_access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VAs can view own tokens"
  ON client_access_tokens FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "VAs can insert tokens"
  ON client_access_tokens FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "VAs can delete own tokens"
  ON client_access_tokens FOR DELETE USING (auth.uid() = created_by);

-- Allow public read by token (no auth)
CREATE POLICY "Anyone can read tokens by token"
  ON client_access_tokens FOR SELECT USING (true);

-- Allow public read of jobs by id (no auth, for portal)
CREATE POLICY "Anyone can read jobs by id"
  ON jobs FOR SELECT USING (true);

-- Add job_id to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
