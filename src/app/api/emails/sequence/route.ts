import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { effectivePlan } from "@/lib/payments";
import { sendOnboardingEmail2, sendOnboardingEmail3 } from "@/lib/email";

export const runtime = "nodejs";

/* GET /api/emails/sequence
 * Daily cron: walks NEW free users through the 3-step onboarding email
 * sequence (welcome already sent at signup, then 2 nurture emails). Stops
 * as soon as a user upgrades. Protected by x-admin-secret. */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "";
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Pull all users (small account, single page is enough; loop for safety).
  let allUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    allUsers = allUsers.concat(data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  const now = Date.now();
  let sent = 0;

  for (const user of allUsers) {
    if (!user.email) continue;
    const days = (now - new Date(user.created_at).getTime()) / 86400000;
    if (days < 0 || days >= 30) continue; // only fresh signups enter the sequence

    // Only still-free users are nurtured (paying users stop the sequence).
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, access_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (effectivePlan(sub) !== "free") continue;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("onboarding_email_step, email_marketing_opt_in")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settings?.email_marketing_opt_in === false) continue;

    const step = settings?.onboarding_email_step ?? 0;
    const name = (user.user_metadata?.full_name as string)?.split(" ")[0] || undefined;
    let newStep = step;

    if (step === 0) {
      newStep = 1; // welcome email already sent at signup — just advance the pointer
    } else if (step === 1 && days >= 1) {
      if (await sendOnboardingEmail2(user.email, name)) { sent++; newStep = 2; }
    } else if (step === 2 && days >= 3) {
      if (await sendOnboardingEmail3(user.email, name)) { sent++; newStep = 3; }
    }

    if (newStep !== step) {
      await supabase.from("user_settings").upsert({ user_id: user.id, onboarding_email_step: newStep }, { onConflict: "user_id" });
    }
  }

  return NextResponse.json({ users: allUsers.length, sent });
}
