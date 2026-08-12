import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Deletes global_jobs rows whose posted_at lies in the future. Those are
 * artifacts of a timezone bug (absolute listing dates treated as UTC) and
 * would otherwise be pinned at the top of the live feed showing "just now".
 * Protected by ADMIN_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("global_jobs")
    .delete()
    .gt("posted_at", now)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: (data || []).length });
}