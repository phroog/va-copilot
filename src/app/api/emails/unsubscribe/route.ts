import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { unsubscribeToken } from "@/lib/email";

export const runtime = "nodejs";

/**
 * GET /api/emails/unsubscribe?e=email&t=token
 * Opts a user out of marketing emails. Token is HMAC(email) so nobody can
 * unsubscribe someone else.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("e") || "").trim().toLowerCase();
  const token = searchParams.get("t") || "";
  if (!email || !token || token !== unsubscribeToken(email)) {
    return new Response("Invalid or expired link.", { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (users?.users || []).find((u) => (u.email || "").toLowerCase() === email);
  if (!user) return new Response("Account not found.", { status: 404 });

  await supabase.from("profiles").update({ email_opt_out: true }).eq("user_id", user.id);

  return new Response(
    "<h3>You have been unsubscribed from marketing emails.</h3><p>You will still receive essential account and billing emails.</p>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}