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

  if (!profile) {
    const alias = randomUUID().split("-")[0];
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, full_name: "", desired_rate: "", bio: "", inbox_email_alias: alias })
      .select()
      .single();
    profile = newProfile;
  } else if (!profile.inbox_email_alias) {
    const alias = randomUUID().split("-")[0];
    const { data: updated } = await supabase
      .from("profiles")
      .update({ inbox_email_alias: alias })
      .eq("user_id", user.id)
      .select()
      .single();
    profile = updated;
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { full_name, desired_rate, bio, business_name, business_address, business_email, bank_account, tax_id } = await request.json();

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, full_name, desired_rate, bio, business_name, business_address, business_email, bank_account, tax_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
