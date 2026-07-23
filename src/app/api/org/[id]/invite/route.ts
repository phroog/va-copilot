import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { user_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Check caller is admin
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
  }

  const targetUserId = body.user_id;
  if (!targetUserId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // Check not already a member
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", id)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const { data: member, error } = await supabase
    .from("org_members")
    .insert({ org_id: id, user_id: targetUserId, role: "member" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member });
}
