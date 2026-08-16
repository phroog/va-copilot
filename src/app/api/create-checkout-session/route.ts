import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PLANS } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/create-checkout-session
 * Creates a Stripe Checkout session (subscription) for basic or pro.
 * Returns { url }.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const plan = body?.plan as "basic" | "pro";
  const priceId = plan ? PLANS[plan]?.priceId : null;
  if (!plan || !priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payment is not configured" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { plan },
    success_url: `${appUrl}/dashboard?upgrade=success`,
    cancel_url: `${appUrl}/pricing`,
    subscription_data: { metadata: { plan } },
  });

  return NextResponse.json({ url: session.url });
}