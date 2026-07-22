-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Org members table
CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Org vault items
CREATE TABLE IF NOT EXISTS org_vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  username TEXT DEFAULT '',
  encrypted_password TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE org_vault_items ENABLE ROW LEVEL SECURITY;

-- Add org_id to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- RLS: organizations
CREATE POLICY "Org admins can view own orgs"
  ON organizations FOR SELECT USING (
    auth.uid() = created_by OR
    auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = id)
  );

CREATE POLICY "Users can create orgs"
  ON organizations FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Org admins can update orgs"
  ON organizations FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = id AND role = 'admin')
  );

-- RLS: org_members
CREATE POLICY "Org members can view members"
  ON org_members FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org admins can insert members"
  ON org_members FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin') OR
    org_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
  );

CREATE POLICY "Org admins can update members"
  ON org_members FOR UPDATE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Org admins can delete members"
  ON org_members FOR DELETE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS: org_vault_items
CREATE POLICY "Org members can view vault items"
  ON org_vault_items FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can insert vault items"
  ON org_vault_items FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can update vault items"
  ON org_vault_items FOR UPDATE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can delete vault items"
  ON org_vault_items FOR DELETE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- Update jobs RLS to allow org members
DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT USING (
    auth.uid() = user_id OR
    (org_id IS NOT NULL AND auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = jobs.org_id))
  );

DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE USING (
    auth.uid() = user_id OR
    (org_id IS NOT NULL AND auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = jobs.org_id))
  );

DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE USING (
    auth.uid() = user_id OR
    (org_id IS NOT NULL AND auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = jobs.org_id))
  );
