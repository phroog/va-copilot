/* Outbound email layer — provider-swappable. Uses Resend by default.
   Set RESEND_API_KEY + EMAIL_FROM (e.g. "Sari <hello@vascora.com>"). */
import { createHmac } from "crypto";

const API = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function from(): string {
  return process.env.EMAIL_FROM || "Sari <onboarding@resend.dev>";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !opts.to) return false;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.html.replace(/<[^>]*>/g, " "),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* Small shared template so transactional mails look consistent. */
export function layoutEmail(title: string, bodyHtml: string, footer?: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#FFF0F5;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #eee;">
      <div style="font-size:20px;font-weight:800;color:#6C4E8F;">🍠 Sari</div>
      <h1 style="font-size:18px;color:#1e293b;margin:16px 0 8px;">${title}</h1>
      <div style="color:#475569;font-size:14px;line-height:1.6;">${bodyHtml}</div>
      ${footer ? `<div style="margin-top:20px;color:#94a3b8;font-size:12px;">${footer}</div>` : ""}
      <div style="margin-top:20px;color:#94a3b8;font-size:11px;border-top:1px solid #eee;padding-top:12px;">
        Vascora OÜ · Tornimäe tn 5, 10145 Tallinn, Estonia · hello@getsari.com
      </div>
    </div>
  </div>`;
}

/* HMAC token used in unsubscribe links so only the account owner can opt out. */
export function unsubscribeToken(email: string): string {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari";
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url").slice(0, 32);
}