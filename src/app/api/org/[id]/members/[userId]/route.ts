import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;

  // Check caller is admin
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can update members" }, { status: 403 });
  }

  let body: { role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (body.role && !["admin", "member"].includes(body.role)) {
    return NextResponse.json({ error: "Role must be 'admin' or 'member'" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (body.role) update.role = body.role;

  const { data, error } = await supabase
    .from("org_members")
    .update(update)
    .eq("org_id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;

  // Check caller is admin
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }

  // Cannot remove self
  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself. Transfer ownership instead." }, { status: 400 });
  }

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
