import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import webpush from "web-push";

function setupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@sari.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!setupWebPush()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 500 });
  }

  const admin = createServiceRoleClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, keys")
    .eq("user_id", user.id);

  if (error) {
    const missing = /does not exist|relation|could not find the table/i.test(error.message);
    return NextResponse.json(
      { error: missing ? "Push isn't set up yet — run the push_subscriptions migration." : error.message, sent: 0 },
      { status: 500 }
    );
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "No push subscription — open Permissions and tap Enable first.", sent: 0 }, { status: 404 });
  }

  const payload = JSON.stringify({
    title: "Sari 💜",
    body: "Test notification — you're all set to get alerts!",
    url: "/learn",
  });

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as any }, payload);
      sent++;
    } catch (e: any) {
      // 410/404 = stale subscription → remove it.
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }

  return NextResponse.json({ success: true, sent });
}