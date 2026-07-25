import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = user.id;

  async function fetchAll(table: string, query?: (q: any) => any) {
    let q = supabase.from(table).select("*").eq("user_id", uid);
    if (query) q = query(q);
    const { data } = await q;
    return data ?? [];
  }

  const [jobs, pitches, time_entries, invoices, invoice_items, client_links, vault_items, notes, events, follow_ups, client_reviews, user_public_profiles, academy_progress, mochi_chats, ai_usage_log, screenshots, job_milestones, user_integrations] = await Promise.all([
    fetchAll("jobs", (q) => q.or(`user_id.eq.${uid},org_id.is.null`)),
    fetchAll("pitches"),
    fetchAll("time_entries"),
    fetchAll("invoices"),
    supabase.from("invoice_items").select("*").in("invoice_id", (await supabase.from("invoices").select("id").eq("user_id", uid)).data?.map(i => i.id) ?? []).then(r => r.data ?? []),
    fetchAll("client_links"),
    fetchAll("vault_items"),
    fetchAll("notes"),
    fetchAll("events"),
    fetchAll("follow_ups"),
    fetchAll("client_reviews"),
    supabase.from("user_public_profiles").select("*").eq("user_id", uid).then(r => r.data ?? []),
    fetchAll("academy_progress"),
    fetchAll("mochi_chats"),
    fetchAll("ai_usage_log"),
    fetchAll("screenshots"),
    fetchAll("job_milestones"),
    fetchAll("user_integrations"),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    user_id: uid,
    email: user.email,
    jobs,
    pitches,
    time_entries,
    invoices,
    invoice_items,
    client_links,
    vault_items,
    notes,
    events,
    follow_ups,
    client_reviews,
    user_public_profiles,
    academy_progress,
    mochi_chats,
    ai_usage_log,
    screenshots,
    job_milestones,
    user_integrations,
  };

  const date = new Date().toISOString().split("T")[0];
  const json = JSON.stringify(backup, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sari-backup-${date}.json"`,
    },
  });
}
