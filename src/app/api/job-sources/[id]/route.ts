import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const updates: Record<string, any> = {};
  const { name, source_type, url, platform, is_active, include_in_live_feed, last_collected_at } = body;

  if (typeof name === "string") updates.name = name.trim();
  if (typeof source_type === "string") updates.source_type = source_type.trim();
  if (typeof url === "string") updates.url = url.trim();
  if (typeof platform === "string") updates.platform = platform.trim();
  if (typeof is_active === "boolean") updates.is_active = is_active;
  if (typeof include_in_live_feed === "boolean") updates.include_in_live_feed = include_in_live_feed;
  if (typeof last_collected_at === "string") updates.last_collected_at = last_collected_at;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("job_sources")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("job_sources").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
