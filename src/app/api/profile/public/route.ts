import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_public_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data ?? null });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { username?: string; display_name?: string; bio?: string; skills?: string; photo_url?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { username, display_name, bio, skills, photo_url } = body;

  if (username !== undefined) {
    const cleaned = username.trim().toLowerCase();
    if (!cleaned || cleaned.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }
    // Check uniqueness
    const { data: existing } = await supabase
      .from("user_public_profiles")
      .select("user_id")
      .eq("username", cleaned)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This username is already taken" }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from("user_public_profiles")
    .upsert({
      user_id: user.id,
      username: username?.trim().toLowerCase(),
      display_name: display_name ?? "",
      bio: bio ?? "",
      skills: skills ?? "",
      photo_url: photo_url ?? "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
