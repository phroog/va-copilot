import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    const now = new Date();
    const start = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endParam ? new Date(endParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // 1. Fetch real events
    const { data: events } = await supabase
      .from("events")
      .select("*, jobs(title, platform), pitches(id)")
      .eq("user_id", user.id)
      .gte("start_time", startIso)
      .lte("start_time", endIso)
      .order("start_time", { ascending: true });

    // 2. Fetch follow-ups as virtual events
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("*, jobs(title, platform, budget)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gte("due_date", startIso.split("T")[0])
      .lte("due_date", endIso.split("T")[0]);

    const virtualEvents = (followUps ?? []).map((fu: any) => ({
      id: `fu-${fu.id}`,
      user_id: user.id,
      title: `Follow-up: ${fu.jobs?.title ?? "Job"}`,
      description: "",
      start_time: new Date(fu.due_date + "T09:00:00").toISOString(),
      end_time: null,
      all_day: true,
      meeting_link: null,
      calendly_link: null,
      job_id: fu.job_id,
      pitch_id: null,
      source: "follow-up",
      created_at: fu.created_at,
      jobs: fu.jobs,
      follow_up_id: fu.id,
      follow_up_done: false,
    }));

    // 3. Combine and sort
    const all = [...(events ?? []), ...virtualEvents].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return NextResponse.json({ events: all });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, start_time, end_time, all_day, meeting_link, calendly_link, job_id, pitch_id, source } = body;

    if (!title || !start_time) {
      return NextResponse.json({ error: "title and start_time are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        title,
        description: description ?? "",
        start_time,
        end_time: end_time ?? null,
        all_day: all_day ?? false,
        meeting_link: meeting_link ?? null,
        calendly_link: calendly_link ?? null,
        job_id: job_id ?? null,
        pitch_id: pitch_id ?? null,
        source: source ?? "manual",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
