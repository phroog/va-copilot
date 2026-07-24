import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");
  const clientName = searchParams.get("client_name");

  let query = supabase
    .from("client_links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (jobId) query = query.eq("job_id", jobId);
  if (clientName) query = query.eq("client_name", clientName);

  const { data: links, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { job_id?: string; client_name: string; title: string; url: string; link_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.client_name || !body.title || !body.url) {
    return NextResponse.json({ error: "client_name, title, and url are required" }, { status: 400 });
  }

  const validTypes = ["website", "project", "communication", "other"];
  const linkType = validTypes.includes(body.link_type || "") ? body.link_type : "other";

  const { data: link, error } = await supabase
    .from("client_links")
    .insert({
      user_id: user.id,
      job_id: body.job_id || null,
      client_name: body.client_name,
      title: body.title,
      url: body.url,
      link_type: linkType,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link });
}
