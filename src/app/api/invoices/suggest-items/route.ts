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

  // Fallback rate when entries were tracked without a rate
  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_hourly_rate")
    .eq("user_id", user.id)
    .maybeSingle();
  const defaultRate = Number(settings?.default_hourly_rate) || 0;

  let totalHours = 0;
  let totalAmount = 0;
  const list = (entries ?? []).flatMap((entry) => {
    const start = new Date(entry.start_time);
    const end = entry.end_time ? new Date(entry.end_time) : null;
    if (!end || end.getTime() <= start.getTime()) return [];

    const hours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
    if (hours <= 0) return [];
    const rate = Number(entry.hourly_rate) || defaultRate || 0;
    const amount = Math.round(hours * rate * 100) / 100;

    totalHours += hours;
    totalAmount += amount;

    return [{
      id: entry.id,
      date: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      description: entry.description || entry.project_name || "Tracked work",
      hours,
      hourly_rate: rate,
      amount,
    }];
  });

  return NextResponse.json({
    entries: list,
    totalHours: Math.round(totalHours * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    entryCount: list.length,
  });
}
