import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PASSES, DAILY_PASS, type PassKey, type DailyPassKey } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/create-pass-session
 * Creates a one-time Stripe Checkout session for an access pass (monthly pass
 * or Money Club daily pass). One-time passes support PayPal, which recurring
 * subscriptions can't use. Returns { url }.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const passKey = body?.pass as PassKey | DailyPassKey;
  const pass = (passKey ? PASSES[passKey as PassKey] : null) || (passKey ? DAILY_PASS[passKey as DailyPassKey] : null);
  if (!pass) return NextResponse.json({ error: "Invalid pass" }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payment is not configured" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: pass.priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { pass: passKey, plan: pass.plan, days: String(pass.days) },
    success_url: `${appUrl}/dashboard?upgrade=success&amount=${Math.round(pass.amountUsd * 100)}`,
    cancel_url: `${appUrl}/pricing`,
    payment_method_types: ["card", "paypal"],
    payment_method_options: { paypal: { preferred_locale: "en-US" } },
    allow_promotion_codes: true,
    managed_payments: { enabled: false },
  });

  return NextResponse.json({ url: session.url });
}
