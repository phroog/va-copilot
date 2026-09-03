import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = [
  "bug",
  "feature_request",
  "billing",
  "scam_safety",
  "job_client",
  "other",
];
const URGENCIES = ["low", "medium", "high", "urgent"];

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("support_letters")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ letters: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { category?: string; urgency?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const category = CATEGORIES.includes(body.category ?? "") ? body.category : "other";
  const urgency = URGENCIES.includes(body.urgency ?? "") ? body.urgency : "medium";

  if (!message) {
    return NextResponse.json({ error: "Please write a message before sending." }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Your message is too long (max 4000 characters)." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("support_letters")
    .insert({ user_id: user.id, category, urgency, message })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, letter: data });
}
