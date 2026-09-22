import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDaily, getEnergy } from "@/lib/learn/energy";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDaily(supabase, user.id);
  const energy = await getEnergy(supabase, user.id);
  return NextResponse.json({ energy });
}