-- Migration 027: Add org-admin SELECT policies for agency reporting
-- Allows agency admins to read time_entries, pitches, and invoices of their org members

-- Helper: check if the requesting user is an admin of any org that the target user belongs to
CREATE OR REPLACE FUNCTION public.is_admin_of_users_org(admin_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members om_admin
    JOIN org_members om_target ON om_admin.org_id = om_target.org_id
    WHERE om_admin.user_id = admin_user_id
      AND om_admin.role = 'admin'
      AND om_target.user_id = target_user_id
  );
$$;

-- time_entries: allow org admin SELECT
DROP POLICY IF EXISTS "Org admins can view time entries of members" ON time_entries;
CREATE POLICY "Org admins can view time entries of members"
  ON time_entries FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin_of_users_org(auth.uid(), user_id)
  );

-- pitches: allow org admin SELECT
DROP POLICY IF EXISTS "Org admins can view pitches of members" ON pitches;
CREATE POLICY "Org admins can view pitches of members"
  ON pitches FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin_of_users_org(auth.uid(), user_id)
  );

-- invoices: allow org admin SELECT
DROP POLICY IF EXISTS "Org admins can view invoices of members" ON invoices;
CREATE POLICY "Org admins can view invoices of members"
  ON invoices FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin_of_users_org(auth.uid(), user_id)
  );
