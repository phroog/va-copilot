// Server-only Facebook Messenger (Meta Messenger Platform) helper.
// Messages go out from the connected Facebook Page.

const GRAPH = "https://graph.facebook.com/v25.0";

export function messengerConfigured(): boolean {
  return !!process.env.MESSENGER_PAGE_TOKEN;
}

async function sendMessage(psid: string, message: unknown): Promise<boolean> {
  const token = process.env.MESSENGER_PAGE_TOKEN;
  if (!token || !psid) return false;
  try {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: "RESPONSE", message }),
    });
    if (!res.ok) console.error("[messenger:send] failed:", res.status, (await res.text().catch(() => "")).slice(0, 400));
    return res.ok;
  } catch (err) {
    console.error("[messenger:send] error:", String(err));
    return false;
  }
}

export function sendMessengerText(psid: string, text: string): Promise<boolean> {
  return sendMessage(psid, { text });
}

export interface MsgQuickReply { title: string; payload: string }

export function sendMessengerQuickReplies(psid: string, text: string, replies: MsgQuickReply[]): Promise<boolean> {
  return sendMessage(psid, {
    text,
    quick_replies: replies.slice(0, 13).map((r) => ({ content_type: "text", title: r.title.slice(0, 20), payload: r.payload })),
  });
}

export const MESSENGER_VERIFY = process.env.MESSENGER_VERIFY_TOKEN || "";