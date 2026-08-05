import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client bypasses RLS. Only use in trusted server contexts
// (Vercel Cron collector, admin upload endpoint). Never expose the key
// to the browser.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ""
  );
}
