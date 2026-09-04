import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";
import { metaCompleteRegistration } from "@/lib/meta-capi";

/* POST /api/emails/welcome
 * Authenticated: sends the welcome email to the current user's account + fires
 * the Meta CAPI CompleteRegistration event (server-side, no ad-block issues). */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = user.email || "";
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  const firstName = (user.user_metadata?.full_name as string)?.split(" ")[0] || undefined;
  const ok = await sendWelcomeEmail(email, firstName);

  // Server-side Meta CAPI conversion.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent") || null;
  const origin = request.headers.get("origin") || null;
  await metaCompleteRegistration({ email, ip, userAgent, sourceUrl: origin });

  return NextResponse.json({ ok });
}