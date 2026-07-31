import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const job_id = searchParams.get("job_id");
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  // Verify job ownership
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", job_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Completed, not yet billed time entries for this job
  const { data: entries, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("job_id", job_id)
    .eq("user_id", user.id)
    .is("invoice_id", null)
    .not("end_time", "is", null)
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const groups = new Map<string, { date: string; label: string; rate: number; hours: number; entry_ids: string[] }>();

  let totalHours = 0;
  for (const entry of entries ?? []) {
    const start = new Date(entry.start_time);
    const end = entry.end_time ? new Date(entry.end_time) : null;
    if (!end || end.getTime() <= start.getTime()) continue;

    const hours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
    if (hours <= 0) continue;
    totalHours += hours;

    const dateKey = start.toISOString().split("T")[0];
    const rate = Number(entry.hourly_rate) || 0;
    const key = `${dateKey}|${rate}`;
    const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const title = entry.description || entry.project_name || "Tracked work";

    if (!groups.has(key)) {
      groups.set(key, { date: label, label: title, rate, hours: 0, entry_ids: [] });
    }
    const g = groups.get(key)!;
    g.hours = Math.round((g.hours + hours) * 100) / 100;
    g.entry_ids.push(entry.id);
  }

  const items = Array.from(groups.values()).map((g) => ({
    description: `${g.date} — ${g.label}`,
    quantity: g.hours,
    unit_price: g.rate,
    total: Math.round(g.hours * g.rate * 100) / 100,
    entry_ids: g.entry_ids,
  }));

  const totalAmount = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const entryCount = items.reduce((s, i) => s + i.entry_ids.length, 0);

  return NextResponse.json({ items, totalHours: Math.round(totalHours * 100) / 100, totalAmount, entryCount });
}
