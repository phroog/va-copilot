import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("user_moods")
    .select("mood")
    .eq("user_id", user.id)
    .eq("mood_date", today)
    .single();

  return NextResponse.json({ mood: data?.mood ?? null });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mood } = await request.json();
  const validMoods = ["happy", "okay", "tired", "motivated", "down"];
  if (!validMoods.includes(mood)) return NextResponse.json({ error: "Invalid mood" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("user_moods")
    .upsert({ user_id: user.id, mood, mood_date: today }, { onConflict: "user_id, mood_date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
