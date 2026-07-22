import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify caller is a member
  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("org_vault_items")
    .select("*")
    .eq("org_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify caller is a member
  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let body: { title?: string; url?: string; username?: string; encrypted_password?: string; notes?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { title, url, username, encrypted_password, notes } = body;
  if (!title || !encrypted_password) {
    return NextResponse.json({ error: "title and encrypted_password required" }, { status: 400 });
  }
  if (title.length > 255) return NextResponse.json({ error: "title too long" }, { status: 400 });

  const { data, error } = await supabase
    .from("org_vault_items")
    .insert({
      org_id: id,
      title,
      url: url ?? "",
      username: username ?? "",
      encrypted_password,
      notes: notes ?? "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
