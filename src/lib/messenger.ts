// Server-only Facebook Messenger (Meta Messenger Platform) helper.
// Messages go out from the connected Facebook Page.

const GRAPH = "https://graph.facebook.com/v25.0";

export function messengerConfigured(): boolean {
  return !!process.env.MESSENGER_PAGE_TOKEN;
}

async function sendMessage(psid: string, message: unknown): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.MESSENGER_PAGE_TOKEN;
  if (!token) return { ok: false, error: "MESSENGER_PAGE_TOKEN not set" };
  if (!psid) return { ok: false, error: "missing recipient" };
  try {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: "RESPONSE", message }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[messenger:send] failed:", res.status, detail.slice(0, 400));
      return { ok: false, error: `${res.status} ${detail.slice(0, 240)}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[messenger:send] error:", String(err));
    return { ok: false, error: String(err) };
  }
}

export async function sendMessenger(psid: string, message: unknown): Promise<{ ok: boolean; error?: string }> {
  return sendMessage(psid, message);
}

export function sendMessengerText(psid: string, text: string): Promise<boolean> {
  return sendMessage(psid, { text }).then((r) => r.ok);
}

export interface MsgQuickReply { title: string; payload: string }

export function sendMessengerQuickReplies(psid: string, text: string, replies: MsgQuickReply[]): Promise<boolean> {
  return sendMessage(psid, {
    text,
    quick_replies: replies.slice(0, 13).map((r) => ({ content_type: "text", title: r.title.slice(0, 20), payload: r.payload })),
  });
}

export const MESSENGER_VERIFY = process.env.MESSENGER_VERIFY_TOKEN || "";