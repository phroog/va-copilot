import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function parseBudgetToNumber(budget: string): number {
  const clean = budget.replace(/[^0-9.]/g, "");
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let synced = 0;

    // 1. Sync time entries (completed ones with hourly_rate > 0)
    const { data: timeEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .not("end_time", "is", null)
      .gt("hourly_rate", 0);

    for (const entry of timeEntries ?? []) {
      const start = new Date(entry.start_time).getTime();
      const end = new Date(entry.end_time).getTime();
      const hours = (end - start) / 3600000;
      const amount = hours * parseFloat(entry.hourly_rate);
      if (amount <= 0) continue;

      // Check if already synced
      const { data: existing } = await supabase
        .from("income_log")
        .select("id")
        .eq("user_id", user.id)
        .eq("source", "time")
        .eq("time_entry_id", entry.id)
        .maybeSingle();

      if (existing) continue;

      const earnedAt = new Date(entry.end_time).toISOString().split("T")[0];
      await supabase.from("income_log").insert({
        user_id: user.id,
        source: "time",
        time_entry_id: entry.id,
        amount: Math.round(amount * 100) / 100,
        description: entry.description || "Time entry",
        earned_at: earnedAt,
      });
      synced++;
    }

    // 2. Sync won pitches with budget
    const { data: pitches } = await supabase
      .from("pitches")
      .select("*, jobs(budget, title)")
      .eq("user_id", user.id)
      .eq("status", "won");

    for (const pitch of pitches ?? []) {
      const budget = (pitch.jobs as any)?.budget;
      if (!budget) continue;
      const amount = parseBudgetToNumber(budget);
      if (amount <= 0) continue;

      const { data: existing } = await supabase
        .from("income_log")
        .select("id")
        .eq("user_id", user.id)
        .eq("source", "job")
        .eq("pitch_id", pitch.id)
        .maybeSingle();

      if (existing) continue;

      const jobTitle = (pitch.jobs as any)?.title || "Won job";
      await supabase.from("income_log").insert({
        user_id: user.id,
        source: "job",
        pitch_id: pitch.id,
        amount,
        description: jobTitle,
        earned_at: new Date().toISOString().split("T")[0],
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
