import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings) {
    const { data: newSettings, error: insertError } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id, default_hourly_rate: 0 })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ settings: newSettings });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const update: Record<string, any> = {};
  if (body.default_hourly_rate !== undefined) update.default_hourly_rate = body.default_hourly_rate;
  if (body.agency_enabled !== undefined) update.agency_enabled = body.agency_enabled === true;
  if (body.default_tax_rate !== undefined) update.default_tax_rate = body.default_tax_rate;
  if (body.notification_email !== undefined) update.notification_email = String(body.notification_email).trim() || null;
  if (body.email_push_matches !== undefined) update.email_push_matches = body.email_push_matches === true;
  if (body.email_marketing_opt_in !== undefined) update.email_marketing_opt_in = body.email_marketing_opt_in === true;
  if (body.onboarding_tour_done !== undefined) update.onboarding_tour_done = body.onboarding_tour_done === true;
  for (const key of [
    "telegram_enabled",
    "telegram_push_matches",
    "telegram_push_followups",
    "telegram_push_invoices",
    "telegram_push_scam",
  ]) {
    if (body[key] !== undefined) update[key] = body[key] === true;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
