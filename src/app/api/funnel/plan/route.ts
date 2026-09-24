import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Records which plan a funnel lead picked so the operator can see intent.
export async function POST(request: Request) {
  const { email, plan } = await request.json().catch(() => ({}));
  const e = (email || "").trim().toLowerCase();
  if (!e || !plan) return NextResponse.json({ error: "email and plan required" }, { status: 400 });

  const admin = createServiceRoleClient();
  await admin.from("funnel_leads").update({ plan: String(plan) }).eq("email", e);
  return NextResponse.json({ ok: true });
}