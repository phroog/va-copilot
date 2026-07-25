-- Migration 026: Add all features (backup, smart timer, google calendar, agency reporting, milestones, screenshots)

-- 1. Time entries: add verified column
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- 2. Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own screenshots"
  ON screenshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own screenshots"
  ON screenshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own screenshots"
  ON screenshots FOR DELETE USING (auth.uid() = user_id);

-- 3. User integrations table (Google Calendar, etc.)
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE USING (auth.uid() = user_id);

-- 4. Add google_event_id to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_event_id TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_etag TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Job milestones table
CREATE TABLE IF NOT EXISTS job_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE job_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job milestones"
  ON job_milestones FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_milestones.job_id
        AND (jobs.org_id IS NOT NULL AND public.is_org_member(jobs.org_id, auth.uid()))
    )
  );

CREATE POLICY "Users can insert own job milestones"
  ON job_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job milestones"
  ON job_milestones FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_milestones.job_id
        AND (jobs.org_id IS NOT NULL AND public.is_org_member(jobs.org_id, auth.uid()))
    )
  );

CREATE POLICY "Users can delete own job milestones"
  ON job_milestones FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_milestones.job_id
        AND (jobs.org_id IS NOT NULL AND public.is_org_member(jobs.org_id, auth.uid()))
    )
  );

-- 6. Add show_verified to jobs for client portal settings
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS show_verified_proof BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS show_milestones BOOLEAN DEFAULT false;
