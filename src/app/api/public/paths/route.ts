import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { funnelPersona } from "@/lib/learn/funnel";

// Public paths for the dream funnel — no auth (marketing data only).
export async function GET() {
  const admin = createServiceRoleClient();
  const { data } = await admin.from("va_paths").select("id,title,subtitle,emoji").eq("is_active", true).order("order_index");
  const paths = (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    emoji: p.emoji,
    persona: funnelPersona(p.title),
  }));
  return NextResponse.json({ paths });
}