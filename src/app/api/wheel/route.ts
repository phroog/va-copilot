import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRIZES = [
  "Extra Pitch Token 📝",
  "Double Happiness 💖",
  "Pet Treat 🍬",
  "Inspiration Boost ✨",
  "Lucky Streak 🍀",
  "Better Luck Next Time 😅",
  "Bonus XP ⚡",
  "Sticker Pack 🎨",
];

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("wheel_spins")
    .select("prize")
    .eq("user_id", user.id)
    .eq("spin_date", today)
    .single();

  return NextResponse.json({
    alreadySpun: !!data,
    prize: data?.prize ?? null,
  });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("wheel_spins")
    .select("id")
    .eq("user_id", user.id)
    .eq("spin_date", today)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already spun today!" }, { status: 400 });
  }

  const prizeIndex = Math.floor(Math.random() * PRIZES.length);
  const prize = PRIZES[prizeIndex];

  const { error } = await supabase
    .from("wheel_spins")
    .insert({ user_id: user.id, prize, spin_date: today });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prize, index: prizeIndex });
}
