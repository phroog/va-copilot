-- Business details columns for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_email TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT '';

-- Client info columns for jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';

-- Invoice status type
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_address TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status DEFAULT 'draft',
  notes TEXT DEFAULT '',
  tax_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );

-- Invoice tracking for time entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
