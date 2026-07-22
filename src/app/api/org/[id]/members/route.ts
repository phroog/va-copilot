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

  const { data: members, error } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", id)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: members ?? [] });
}
