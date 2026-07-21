import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const project = searchParams.get("project");
  const exportType = searchParams.get("export");

  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false });

  if (date) {
    const dayStart = new Date(date + "T00:00:00Z").toISOString();
    const dayEnd = new Date(date + "T23:59:59Z").toISOString();
    query = query.gte("start_time", dayStart).lte("start_time", dayEnd);
  }

  if (project) {
    query = query.eq("project_name", project);
  }

  const { data: entries, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (exportType === "csv") {
    const header = "Date,Description,Project,Start,End,Duration (hours),Rate,Amount";
    const rows = (entries ?? []).map((e: any) => {
      const start = new Date(e.start_time);
      const end = e.end_time ? new Date(e.end_time) : new Date();
      const diffMs = end.getTime() - start.getTime();
      const diffHours = (diffMs / 3600000).toFixed(2);
      const amount = (parseFloat(diffHours) * parseFloat(e.hourly_rate ?? "0")).toFixed(2);
      return [
        start.toISOString().split("T")[0],
        `"${(e.description ?? "").replace(/"/g, '""')}"`,
        `"${(e.project_name ?? "").replace(/"/g, '""')}"`,
        start.toISOString(),
        end.toISOString(),
        diffHours,
        e.hourly_rate ?? "0",
        amount,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="time-entries-${date ?? "all"}.csv"`,
      },
    });
  }

  // Also fetch running timer separately
  const { data: running } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    entries: entries ?? [],
    running: running ?? null,
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description, project_name, start_time, end_time, hourly_rate, job_id, event_id } = await request.json();

  if (!start_time) return NextResponse.json({ error: "start_time is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: user.id,
      description: description ?? "",
      project_name: project_name ?? "",
      start_time,
      end_time: end_time ?? null,
      hourly_rate: hourly_rate ?? 0,
      job_id: job_id ?? null,
      event_id: event_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
