import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing entry id" }, { status: 400 });

    const body = await request.json();

    const update: Record<string, any> = {};
    if (body.description !== undefined) update.description = body.description;
    if (body.project_name !== undefined) update.project_name = body.project_name;
    if (body.start_time !== undefined) update.start_time = body.start_time;
    if (body.end_time !== undefined) update.end_time = body.end_time;
    if (body.hourly_rate !== undefined) update.hourly_rate = body.hourly_rate;
    if (body.job_id !== undefined) update.job_id = body.job_id;
    if (body.event_id !== undefined) update.event_id = body.event_id;

    const { data, error } = await supabase
      .from("time_entries")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing entry id" }, { status: 400 });

    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
