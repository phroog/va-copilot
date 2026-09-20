// Server-only push helpers built on web-push.
import webpush from "web-push";

export function setupWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@sari.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export interface PushSub {
  endpoint: string;
  keys: unknown;
}

// Sends a push to every subscription; drops stale (410/404) subs.
export async function sendToSubs(
  admin: any,
  subs: PushSub[],
  title: string,
  body: string,
  url: string
): Promise<number> {
  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as any }, payload);
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return sent;
}