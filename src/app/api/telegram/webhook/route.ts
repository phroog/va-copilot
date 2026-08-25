import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTelegram } from "@/lib/telegram";
import { formatMoney, convert, normalizeCurrency } from "@/lib/currency";

export const runtime = "nodejs";

/* Verify that the request really comes from Telegram's servers using the secret
   token we set when registering the webhook. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // if no secret configured, accept (dev fallback)
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId: number = msg.chat?.id;
  const text: string = (msg.text || "").trim();
  const username: string = (msg.chat?.username || "").toString();

  if (!chatId) return NextResponse.json({ ok: true });

  try {
    await handleMessage(chatId, text, username);
  } catch {
    /* never throw to Telegram */
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(chatId: number, text: string, username: string) {
  const supabase = createClient();

  // ── /start <code> → link this chat to a Sari account ──────────────
  const startMatch = text.match(/^\/start(?:\s+(\d{6}))?/i);
  if (startMatch) {
    const code = startMatch[1];
    if (!code) {
      await sendTelegram(chatId, "👋 Willkommen! Um dein Sari-Konto zu verbinden:\n1. Öffne Sari → Einstellungen → Telegram\n2. Klicke auf „Mit Telegram verbinden“\n3. Schicke mir den 6-stelligen Code mit /start <code>");
      return;
    }
    // SECURITY DEFINER RPC: verifies the code + links the chat, bypassing RLS.
    const { data, error } = await supabase.rpc("telegram_link_account", {
      p_code: code,
      p_chat_id: chatId,
      p_username: username,
    });
    if (error || !data?.ok) {
      await sendTelegram(chatId, "❌ Ungültiger oder abgelaufener Code. Bitte neuen Code in Sari generieren.");
      return;
    }
    await sendTelegram(chatId, "✅ Verbunden! Du erhältst jetzt Push-Benachrichtigungen. Verfügbare Befehle:\n/match – neueste Matches\n/stats – Wochenstatistik\n/invoices – offene Rechnungen");
    return;
  }

  // ── All other commands need a linked account ─────────────────────
  // Resolve via RPC (webhook has no user session, RLS would block the lookup).
  const { data: userIdData } = await supabase.rpc("telegram_user_for_chat", { p_chat_id: chatId });
  const userId: string | null = userIdData || null;
  if (!userId) {
    await sendTelegram(chatId, "⚠️ Dieses Chat ist nicht mit einem Sari-Konto verbunden. Schicke /start <code> um zu verbinden.");
    return;
  }

  if (/^\/match/i.test(text)) {
    await cmdMatch(userId, chatId);
    return;
  }
  if (/^\/stats/i.test(text)) {
    await cmdStats(userId, chatId);
    return;
  }
  if (/^\/invoices/i.test(text)) {
    await cmdInvoices(userId, chatId);
    return;
  }

  await sendTelegram(chatId, "Verfügbare Befehle:\n/match\n/stats\n/invoices");
}

async function cmdMatch(userId: string, chatId: number) {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("job_vector")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: jobs } = await supabase
    .from("global_jobs")
    .select("id, title, platform, budget, posted_at, profile_vector")
    .order("posted_at", { ascending: false })
    .limit(20);

  const list = (jobs ?? [])
    .map((j) => {
      let match: number | null = null;
      const vec = Array.isArray(j.profile_vector) ? j.profile_vector : null;
      const pvec = profile?.job_vector;
      if (vec && Array.isArray(pvec)) {
        const dot = vec.reduce((s, v, i) => s + v * (pvec[i] || 0), 0);
        match = Math.round((dot / 125) * 100);
      }
      return { ...j, match };
    })
    .filter((j) => j.match != null && j.match >= 60)
    .slice(0, 5);

  if (list.length === 0) {
    await sendTelegram(chatId, "📡 Noch keine starken Matches. Richte dein Profil in Sari ein und warte auf neue Jobs.");
    return;
  }

  const lines = ["🎯 Deine neuesten Matches:\n"];
  for (const j of list) {
    const when = j.posted_at ? new Date(j.posted_at).toLocaleDateString() : "";
    lines.push(`<b>${j.title}</b> (${j.match}%)\n${j.platform} · ${j.budget || "k.A."} · ${when}\n`);
  }
  await sendTelegram(chatId, lines.join("\n"));
}

async function cmdStats(userId: string, chatId: number) {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_currency")
    .eq("user_id", userId)
    .maybeSingle();
  const base = normalizeCurrency(profile?.base_currency || "EUR");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const { data: income } = await supabase
    .from("income_log")
    .select("amount, currency, earned_at")
    .eq("user_id", userId)
    .gte("earned_at", weekAgo.slice(0, 10));

  let total = 0;
  let count = 0;
  for (const r of income ?? []) {
    total += convert(Number(r.amount) || 0, r.currency || "USD", base);
    count++;
  }

  const { data: apps } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", weekAgo);
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("user_id", userId);

  const openInvoices = (invoices ?? []).filter((i) => i.status === "sent" || i.status === "overdue").length;

  await sendTelegram(
    chatId,
    `📊 <b>Wochenstatistik</b>\n\n` +
      `💰 Einnahmen (7 Tage): <b>${formatMoney(Math.round(total * 100) / 100, base)}</b>\n` +
      `🧾 ${count} Einnahme-Posten\n` +
      `📝 ${(apps ?? []).length} Bewerbungen\n` +
      `📄 ${openInvoices} offene Rechnungen`
  );
}

async function cmdInvoices(userId: string, chatId: number) {
  const supabase = createServiceRoleClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, status, tax_rate, currency, invoice_items(quantity, unit_price, total)")
    .eq("user_id", userId)
    .in("status", ["sent", "overdue"]);

  const list = invoices ?? [];
  if (list.length === 0) {
    await sendTelegram(chatId, "📄 Keine offenen Rechnungen. Gut gemacht!");
    return;
  }

  const lines = ["📄 <b>Offene Rechnungen</b>:\n"];
  for (const inv of list) {
    const sub = (inv.invoice_items || []).reduce((s, i) => s + Number(i.total ?? (i.quantity || 0) * (i.unit_price || 0)), 0);
    const tot = sub + sub * (Number(inv.tax_rate || 0) / 100);
    lines.push(`${inv.invoice_number} · ${inv.client_name}\n  ${formatMoney(Math.round(tot * 100) / 100, inv.currency || "USD")} · <b>${inv.status.toUpperCase()}</b>\n`);
  }
  await sendTelegram(chatId, lines.join("\n"));
}