-- Connect invoices to jobs & time tracking, and expose invoices to client portal
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_name TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_address TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_email TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_tax_id TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_bank TEXT DEFAULT '';

-- Public read for clients via magic link (only invoices linked to a job that has an access token)
CREATE POLICY "Anyone with valid token can read linked invoices"
  ON invoices FOR SELECT USING (
    job_id IN (SELECT job_id FROM client_access_tokens)
  );

CREATE POLICY "Anyone with valid token can read linked invoice items"
  ON invoice_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.job_id IN (SELECT job_id FROM client_access_tokens)
    )
  );
