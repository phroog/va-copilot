import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription } = await request.json().catch(() => ({}));
  if (!subscription?.endpoint) return NextResponse.json({ error: "subscription required" }, { status: 400 });

  const keys = (subscription.keys as Record<string, string>) ?? {};

  // Service role: push subscriptions are written server-side only (the user is
  // already verified above), so this works regardless of RLS policies.
  const admin = createServiceRoleClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: subscription.endpoint, keys },
    { onConflict: "user_id,endpoint", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}