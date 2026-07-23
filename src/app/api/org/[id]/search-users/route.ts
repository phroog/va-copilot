import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

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

  // Search profiles by name or public_id (case-insensitive)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, public_id")
    .or(`full_name.ilike.%${q}%,public_id.ilike.%${q}%`)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter out users already in the org
  const { data: existingMembers } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", id);

  const existingIds = new Set((existingMembers ?? []).map((m: any) => m.user_id));
  const users = (profiles ?? [])
    .filter((p: any) => !existingIds.has(p.user_id) && p.user_id !== user.id)
    .map((p: any) => ({ user_id: p.user_id, name: p.full_name || p.public_id || p.user_id.slice(0, 8), public_id: p.public_id }));

  return NextResponse.json({ users });
}
