import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile = profileData;

  const needsUpdate: Record<string, any> = {};

  if (!profile) {
    const alias = randomUUID().split("-")[0];
    const pubId = "user_" + randomUUID().split("-")[0].slice(0, 8);
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, full_name: "", desired_rate: "", bio: "", inbox_email_alias: alias, public_id: pubId })
      .select()
      .single();
    profile = newProfile;
  } else {
    if (!profile.inbox_email_alias) {
      needsUpdate.inbox_email_alias = randomUUID().split("-")[0];
    }
    if (!profile.public_id) {
      needsUpdate.public_id = "user_" + randomUUID().split("-")[0].slice(0, 8);
    }
    if (Object.keys(needsUpdate).length > 0) {
      const { data: updated } = await supabase
        .from("profiles")
        .update(needsUpdate)
        .eq("user_id", user.id)
        .select()
        .single();
      if (updated) profile = updated;
    }
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { full_name, desired_rate, bio, business_name, business_address, business_email, bank_account, tax_id, public_id } = await request.json();

  const update: Record<string, any> = { full_name, desired_rate, bio, business_name, business_address, business_email, bank_account, tax_id };

  if (public_id !== undefined) {
    const cleaned = public_id.trim();
    if (!cleaned || cleaned.length < 3) {
      return NextResponse.json({ error: "Public ID must be at least 3 characters" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      return NextResponse.json({ error: "Public ID can only contain letters, numbers, and underscores" }, { status: 400 });
    }
    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("public_id", cleaned)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This Public ID is already taken" }, { status: 409 });
    }
    update.public_id = cleaned;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, ...update })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
