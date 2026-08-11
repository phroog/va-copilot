import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface KeywordInput {
  id: string;
  keywords: string[];
}

/** Replace the keyword list for one or more sources (admin dashboard). */
export async function PUT(request: Request) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  const ok = await verifyAdminSession(token, secret);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sources?: KeywordInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const list: KeywordInput[] = (body.sources ?? []).map((s) => ({
    id: s.id,
    keywords: Array.isArray(s.keywords)
      ? s.keywords.map((k) => (k || "").trim()).filter(Boolean)
      : [],
  }));
  if (list.length === 0) {
    return NextResponse.json({ error: "Expected { sources: [{ id, keywords }] }" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  for (const entry of list) {
    // Confirm the source exists
    const { data: source } = await supabase
      .from("job_sources")
      .select("id")
      .eq("id", entry.id)
      .single();
    if (!source) {
      return NextResponse.json({ error: `Source ${entry.id} not found` }, { status: 404 });
    }

    // Replace: delete old keywords, insert new ones with stable order.
    const { error: delErr } = await supabase
      .from("job_source_keywords")
      .delete()
      .eq("source_id", entry.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (entry.keywords.length > 0) {
      const rows = entry.keywords.map((keyword, idx) => ({
        source_id: entry.id,
        keyword,
        position: idx,
      }));
      const { error: insErr } = await supabase.from("job_source_keywords").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, updated: list.map((l) => ({ id: l.id, count: l.keywords.length })) });
}