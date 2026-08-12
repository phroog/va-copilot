import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isRelevantJob } from "@/lib/jobs/relevance";

/**
 * One-off sweep: delete existing global_jobs that fail the relevance filter
 * (legacy rows inserted before the filter existed). Protected by ADMIN_SECRET.
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
  let removed = 0;
  let scanned = 0;
  let offset = 0;
  const PAGE = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("global_jobs")
      .select("id, title, description, skills")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;

    scanned += data.length;
    const toDelete = data.filter((row: any) => !isRelevantJob(row)).map((row: any) => row.id);
    if (toDelete.length > 0) {
      const { error: delError } = await supabase.from("global_jobs").delete().in("id", toDelete);
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
      removed += toDelete.length;
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return NextResponse.json({ ok: true, scanned, removed });
}