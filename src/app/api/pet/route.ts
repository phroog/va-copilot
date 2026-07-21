import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function calculateDecay(pet: any) {
  const now = Date.now();
  const hoursSinceFed = (now - new Date(pet.last_fed).getTime()) / 3600000;
  const hoursSincePlayed = (now - new Date(pet.last_played).getTime()) / 3600000;

  const hunger = Math.max(0, pet.hunger - Math.floor(hoursSinceFed));
  const happiness = Math.max(0, pet.happiness - Math.floor(hoursSincePlayed * 0.5));

  return { ...pet, hunger, happiness };
}

async function getOrCreatePet(supabase: any, userId: string) {
  let { data: pet } = await supabase
    .from("user_pets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!pet) {
    const { data: newPet } = await supabase
      .from("user_pets")
      .insert({ user_id: userId })
      .select()
      .single();
    pet = newPet;
  }

  return calculateDecay(pet);
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pet = await getOrCreatePet(supabase, user.id);
  return NextResponse.json({ pet });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();
  const now = new Date().toISOString();

  if (action === "feed") {
    const { data, error } = await supabase
      .from("user_pets")
      .update({ hunger: 100, last_fed: now })
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const pet = calculateDecay(data);
    pet.hunger = 100;
    pet.happiness = Math.min(100, pet.happiness + 10);
    return NextResponse.json({ pet, message: "Yummy! 🍣" });
  }

  if (action === "play") {
    const { data, error } = await supabase
      .from("user_pets")
      .update({ happiness: 100, last_played: now })
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const pet = calculateDecay(data);
    pet.happiness = 100;
    return NextResponse.json({ pet, message: "Wheee! 🎾" });
  }

  if (action === "rename") {
    const { name } = await request.json();
    const { data, error } = await supabase
      .from("user_pets")
      .update({ pet_name: name })
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pet: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
