// Server-only Facebook Messenger (Meta Messenger Platform) helper.
// Messages go out from the connected Facebook Page.

const GRAPH = "https://graph.facebook.com/v25.0";

export function messengerConfigured(): boolean {
  return !!process.env.MESSENGER_PAGE_TOKEN;
}

// Resolve the Page (id + its own Page access token). A System-User/User token
// can't post messages directly — we must use the Page token from /me/accounts.
// Cached per process.
let cachedPage: { id: string; token: string } | null | undefined;
async function getPage(token: string): Promise<{ id: string; token: string } | null> {
  const envId = process.env.MESSENGER_PAGE_ID;
  if (envId) return { id: envId, token };
  if (cachedPage !== undefined) return cachedPage;
  try {
    const r = await fetch(`${GRAPH}/me/accounts?fields=id,access_token&access_token=${encodeURIComponent(token)}`);
    if (r.ok) {
      const j = await r.json();
      const p = j?.data?.[0];
      cachedPage = p?.id ? { id: p.id, token: p.access_token ?? token } : null;
    } else {
      cachedPage = null;
    }
  } catch {
    cachedPage = null;
  }
  return cachedPage ?? null;
}

async function sendMessage(psid: string, message: unknown): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.MESSENGER_PAGE_TOKEN;
  if (!token) return { ok: false, error: "MESSENGER_PAGE_TOKEN not set" };
  if (!psid) return { ok: false, error: "missing recipient" };
  const page = await getPage(token);
  if (!page) return { ok: false, error: "Couldn't resolve the Page — set MESSENGER_PAGE_ID or assign the Page to the System User." };
  try {
    const res = await fetch(`${GRAPH}/${page.id}/messages?access_token=${encodeURIComponent(page.token)}`, {
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
  }).then((r) => r.ok);
}

export const MESSENGER_VERIFY = process.env.MESSENGER_VERIFY_TOKEN || "";