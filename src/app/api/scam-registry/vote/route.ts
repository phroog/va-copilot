import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/scam-registry/vote  { id, vote: true|false }
 * Up/down vote on a registry entry. One vote per user per entry.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; vote?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id || typeof body.vote !== "boolean") {
    return NextResponse.json({ error: "id and vote are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("scam_registry_votes")
    .upsert({ user_id: user.id, entry_id: body.id, vote: body.vote }, { onConflict: "user_id,entry_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute vote counts from the votes table.
  const { data: entry } = await supabase.from("scam_registry").select("id").eq("id", body.id).maybeSingle();
  if (entry) {
    const { count: up } = await supabase
      .from("scam_registry_votes")
      .select("id", { count: "exact", head: true })
      .eq("entry_id", body.id)
      .eq("vote", true);
    const { count: down } = await supabase
      .from("scam_registry_votes")
      .select("id", { count: "exact", head: true })
      .eq("entry_id", body.id)
      .eq("vote", false);
    await supabase.from("scam_registry").update({ votes_up: up ?? 0, votes_down: down ?? 0 }).eq("id", body.id);
  }

  return NextResponse.json({ ok: true });
}