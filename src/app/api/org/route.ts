import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("*, org_members!inner(*)")
    .eq("org_members.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orgs: orgs ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name } = body;
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

  // Add creator as admin
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "admin" });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  return NextResponse.json({ org });
}
