/* WhatsApp Business Cloud API helper.
   Sends outbound WhatsApp messages via the Meta Graph API — used for
   "speed-to-lead" (welcome on signup) and the inbound webhook bot.

   Env required:
   - WHATSAPP_TOKEN           Meta app access token
   - WHATSAPP_PHONE_NUMBER_ID the WhatsApp Business phone-number id
   - WHATSAPP_VERIFY_TOKEN    webhook verification token (get/webhook only) */

const GRAPH = "https://graph.facebook.com/v25.0";

export function whatsappConfigured(): boolean {
  return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}
/* Normalize a user-entered phone number to WhatsApp's international format
   (digits only, no leading +). Accepts +49..., 0049..., 49..., etc. */
export function normalizePhone(input: string): string {
  let p = (input || "").replace(/[\s\-().]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("+")) p = p.slice(1);
  return p.replace(/\D/g, "");
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !to || !body) return false;
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[whatsapp:send] failed:", res.status, detail.slice(0, 500));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp:send] error:", String(err));
    return false;
  }
}

// Alias used by the inbound webhook bot.
export const sendWhatsAppText = sendWhatsApp;

export interface WaButton { id: string; title: string }
export interface WaRow { id: string; title: string; description?: string }

export async function sendWhatsAppButtons(to: string, text: string, buttons: WaButton[]): Promise<boolean> {
  return sendInteractive(to, {
    type: "button",
    body: { text },
    action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })) },
  });
}

export async function sendWhatsAppList(to: string, text: string, rows: WaRow[]): Promise<boolean> {
  return sendInteractive(to, {
    type: "list",
    body: { text },
    action: { button: "Choose", sections: [{ title: "Options", rows: rows.map((r) => ({ id: r.id, title: r.title, ...(r.description ? { description: r.description } : {}) })) }] },
  });
}

async function sendInteractive(to: string, interactive: unknown): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !to) return false;
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "interactive", interactive }),
    });
    if (!res.ok) console.error("[whatsapp:interactive] failed:", res.status, (await res.text().catch(() => "")).slice(0, 500));
    return res.ok;
  } catch (err) {
    console.error("[whatsapp:interactive] error:", String(err));
    return false;
  }
}

/* Send a WhatsApp template message — the only way to message a user who has
   NOT messaged the business first (no open 24h window). The template must be
   approved in the Meta WhatsApp manager. */
export async function sendWhatsAppTemplate(to: string, templateName: string, params?: string[]): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !to || !templateName) return false;
  const components = params?.length
    ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p })) }]
    : undefined;
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en_US" },
          ...(components ? { components } : {}),
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[whatsapp:template] failed:", res.status, detail.slice(0, 500));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp:template] error:", String(err));
    return false;
  }
}

/* The first touch — sent instantly on signup. Short, warm, gets a reply. */
export function whatsappWelcomeMessage(firstName?: string): string {
  const name = firstName ? `, ${firstName}` : "";
  return (
    `Hey${name}! 👋 Welcome to Sari 🍠 — I just found jobs that match your profile.\n\n` +
    `Reply "yes" and I'll send your top 3 matches right here in WhatsApp.`
  );
}

export const WHATSAPP_VERIFY = process.env.WHATSAPP_VERIFY_TOKEN || "";
export const WHATSAPP_CALENDLY = "https://calendly.com/hello-vascora/sari-dream-call";
// Cal.com booking page for the audit call (with phone/email prefill params).
export const CAL_BOOKING_URL = "https://cal.com/julian.sari-mwpfcf/15min";
export function calBookingLink(phone?: string, email?: string): string {
  const params = new URLSearchParams();
  const p = (phone || "").replace(/\D/g, "");
  if (p && p.length >= 8 && p.length <= 15) {
    // Cal.com prefills whichever field slug matches — try the common ones.
    params.set("phone", p);
    params.set("phoneNumber", p);
    params.set("whatsapp", p);
  }
  if (email) params.set("email", email);
  const q = params.toString();
  return q ? `${CAL_BOOKING_URL}?${q}` : CAL_BOOKING_URL;
}