import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Messages the operator sends (via the admin tool) — delivered in the user's feed.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = (user.email || "").toLowerCase();
  const [msgs, reads] = await Promise.all([
    supabase
      .from("feed_messages")
      .select("*")
      .or(`recipient_email.eq.${email},recipient_email.is.null`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("feed_message_reads").select("message_id").eq("user_id", user.id),
  ]);

  const readIds = new Set((reads.data ?? []).map((r: any) => r.message_id));
  const messages = (msgs.data ?? []).map((m: any) => ({
    id: m.id,
    sender_name: m.sender_name,
    title: m.title,
    body: m.body,
    created_at: m.created_at,
    read: readIds.has(m.id),
  }));

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json().catch(() => ({}));
  const list = (Array.isArray(ids) ? ids : [])
    .filter((id: any) => typeof id === "string")
    .map((id: string) => ({ user_id: user.id, message_id: id }));
  if (list.length > 0) {
    await supabase.from("feed_message_reads").upsert(list, { onConflict: "user_id,message_id", ignoreDuplicates: true });
  }
  return NextResponse.json({ ok: true });
}