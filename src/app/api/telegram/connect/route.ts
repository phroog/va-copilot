import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { telegramConfigured } from "@/lib/telegram";
import crypto from "crypto";

/**
 * GET  /api/telegram/connect → { configured, linked, chatId, username }
 * POST /api/telegram/connect → generate a fresh 6-digit verification code
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: link } = await supabase
    .from("telegram_links")
    .select("chat_id, username, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    configured: telegramConfigured(),
    linked: !!link,
    chatId: link?.chat_id ?? null,
    username: link?.username ?? null,
    linkedAt: link?.created_at ?? null,
  });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram-Bot ist noch nicht konfiguriert (TELEGRAM_BOT_TOKEN fehlt)." }, { status: 503 });
  }

  const { data: existing } = await supabase
    .from("telegram_links")
    .select("chat_id, username")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Bereits verbunden." }, { status: 409 });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  await supabase.from("telegram_verify_codes").upsert({ user_id: user.id, code, created_at: new Date().toISOString() }, { onConflict: "user_id" });

  return NextResponse.json({ code, botUsername: process.env.TELEGRAM_BOT_USERNAME || "" });
}

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("telegram_links").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}