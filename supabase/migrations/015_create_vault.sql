-- Vault salt and key check for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vault_salt TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vault_key_check TEXT DEFAULT '';

-- Vault items table
CREATE TABLE IF NOT EXISTS vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  username TEXT DEFAULT '',
  encrypted_password TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault items"
  ON vault_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vault items"
  ON vault_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vault items"
  ON vault_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vault items"
  ON vault_items FOR DELETE USING (auth.uid() = user_id);
