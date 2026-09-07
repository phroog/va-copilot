import { NextResponse } from "next/server";
import { metaPurchase } from "@/lib/meta-capi";

export const runtime = "nodejs";

/* GET /api/meta/test-purchase?value=9.99&email=you@example.com
 * Test helper: sends a Purchase event to Meta via the Conversions API so you
 * can verify the pixel is receiving purchase signals (for sale optimization)
 * without a real sale. Returns whether Meta accepted the event. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = Number(url.searchParams.get("value")) || 9.99;
  const currency = (url.searchParams.get("currency") || "USD").toUpperCase();
  const email = url.searchParams.get("email") || null;

  const sent = await metaPurchase({
    email,
    value: Math.min(100000, Math.max(0, value)),
    currency,
    sourceUrl: process.env.NEXT_PUBLIC_APP_URL || "https://getsari.com",
  });

  return NextResponse.json({
    sent,
    event: "Purchase",
    value: Math.min(100000, Math.max(0, value)),
    currency,
    note: sent
      ? "Event accepted by Meta. Check Events Manager → Test Events."
      : "META_ACCESS_TOKEN is missing or Meta rejected the event.",
  });
}
