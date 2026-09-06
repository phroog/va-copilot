/* Outbound email layer — provider-swappable. Uses Resend by default.
   Set RESEND_API_KEY + EMAIL_FROM (e.g. "Sari <hello@vascora.com>"). */
import { createHmac } from "crypto";
import { daysLeft, formatPeso, coffeeCompare } from "@/lib/sale";

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

/* Welcome email sent right after account creation. Light, friendly, points to
   the workspace. Returns true on success (safe to fire-and-forget). */
export async function sendWelcomeEmail(to: string, firstName?: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://getsari.com";
  const name = firstName || "friend";
  return sendEmail({
    to,
    subject: "Welcome to Sari 🍠 — your workspace is ready",
    html: layoutEmail(
      "Welcome aboard 🍠",
      `<p>Hey ${name},</p>
       <p>Your workspace is ready. Here's what's waiting for you:</p>
       <ul style="line-height:1.7;padding-left:18px;">
         <li>📡 A live feed of matching jobs from 10+ platforms</li>
         <li>🤖 AI pitches written for each client</li>
         <li>🛡️ Scam checks before you waste a week</li>
         <li>⏱️ Time tracking your clients can actually trust</li>
       </ul>
       <p style="margin-top:16px;"><a href="${appUrl}/dashboard" style="display:inline-block;background:#6C4E8F;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700;">Open my workspace →</a></p>
       <p style="margin-top:16px;color:#64748b;font-size:13px;">Quick tip: connect Telegram in Settings → Configuration to get job alerts the second they appear.</p>
       <p style="margin-top:12px;color:#94a3b8;font-size:12px;">Logging in on another device? Use your email on the <a href="${appUrl}/auth/login" style="color:#6C4E8F;">login page</a> — or set a password in <b>Settings → Password</b>.</p>`
    ),
  });
}

/* ── Onboarding sequence: 3 emails over the first ~3 days. Each uses a
   different psychological lever to bring the user back and close the sale. ── */

/* Email 2 (day 1) — social proof + FOMO + foot-in-the-door. */
export async function sendOnboardingEmail2(to: string, firstName?: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://getsari.com";
  const name = firstName || "friend";
  return sendEmail({
    to,
    subject: "The best jobs are gone in minutes",
    html: layoutEmail(
      "Marco found his client in 6 days",
      `<p>Hey ${name},</p>
       <p>Marco, a VA from Manila, landed his first Sari client in <b>6 days</b>. His first month paid <b>$6,900</b>.</p>
       <p>He didn't refresh job boards all day. He didn't write 40 pitches by hand. He let Sari do the hunting.</p>
       <p style="margin-top:12px;">Here's the uncomfortable part: the best jobs — the 75%+ matches, the clients who pay on time — are usually <b>gone within minutes</b>. While you're deciding, someone else is applying.</p>
       <div style="margin-top:16px;background:#F5F3FF;border-radius:12px;padding:16px;">
         <p style="margin:0;font-weight:700;color:#1e293b;">Your first step takes 2 minutes</p>
         <p style="margin:6px 0 0;color:#475569;font-size:13px;">Connect Telegram in Settings → Configuration, and matching jobs get pushed to your phone the instant they appear. That's the exact moment the winners apply.</p>
       </div>
       <p style="margin-top:16px;"><a href="${appUrl}/dashboard/live-feed" style="display:inline-block;background:#6C4E8F;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700;">Find my first job →</a></p>
       <p style="margin-top:14px;color:#64748b;font-size:13px;">Want the full advantage? <a href="${appUrl}/pricing" style="color:#6C4E8F;font-weight:700;">Sari Bloom starts at $4.99</a> (${formatPeso(4.99)} — ${coffeeCompare(4.99)}).</p>`
    ),
  });
}

/* Email 3 (day 3) — scarcity + loss aversion + anchoring. */
export async function sendOnboardingEmail3(to: string, firstName?: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://getsari.com";
  const name = firstName || "friend";
  const days = daysLeft();
  return sendEmail({
    to,
    subject: days > 0 ? `Your launch discount ends in ${days} ${days === 1 ? "day" : "days"}` : "Last chance — the discount is closing",
    html: layoutEmail(
      "While you wait, it costs you $350 a month",
      `<p>Hey ${name},</p>
       <p>Be honest with yourself for a second: every week you keep job-hunting by hand, you're losing about <b>12 hours</b> and roughly <b>$350</b> in missed work.</p>
       <p>That's not a guess — that's what the average VA loses to refreshing boards, rewriting the same pitch, and chasing scam clients.</p>
       <div style="margin-top:16px;background:#FDF2F8;border-radius:12px;padding:16px;border:1px solid #F9A8D4;">
         <p style="margin:0;font-weight:700;color:#BE185D;">Your launch discount is running out</p>
         <p style="margin:6px 0 0;color:#475569;font-size:13px;">
           Sari Money Club is normally <span style="text-decoration:line-through;">$19.99</span> — right now it's <b>$9.99</b>${days > 0 ? ` (${days} ${days === 1 ? "day" : "days"} left)` : ""}.
           Bloom is <span style="text-decoration:line-through;">$9.99</span> → <b>$4.99</b> (${formatPeso(4.99)}/mo — ${coffeeCompare(4.99)}).
         </p>
       </div>
       <p style="margin-top:16px;">When the sale ends, the price goes back up. The jobs don't stop — they just go to someone else.</p>
       <p style="margin-top:16px;"><a href="${appUrl}/pricing" style="display:inline-block;background:#DB2777;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700;">Lock in the discount →</a></p>
       <p style="margin-top:14px;color:#64748b;font-size:13px;">Cancel anytime. But honestly — by then, your client is already paying for it.</p>`
    ),
  });
}