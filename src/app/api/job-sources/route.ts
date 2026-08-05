import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["web"];

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sources, error } = await supabase
    .from("job_sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: sources ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name = (body.name || "").trim();
  const sourceType = (body.source_type || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(sourceType)) {
    return NextResponse.json({ error: "source_type must be 'web'" }, { status: 400 });
  }

  const insert: Record<string, any> = {
    name,
    source_type: sourceType,
    url: body.url?.trim() || null,
    platform: body.platform?.trim() || null,
    is_active: body.is_active ?? true,
    include_in_live_feed: body.include_in_live_feed ?? true,
  };

  const { data, error } = await supabase.from("job_sources").insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}
