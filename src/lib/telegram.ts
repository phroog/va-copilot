import { createClient } from "@/lib/supabase/server";

const TELEGRAM_API = "https://api.telegram.org";

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function telegramConfigured(): boolean {
  return !!botToken();
}

/* Send a plain text message to a chat. Returns true on success. */
export async function sendTelegram(chatId: number | string, text: string): Promise<boolean> {
  const token = botToken();
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* Find the user_id linked to a Telegram chat_id (for inbound bot commands). */
export async function userIdForChat(chatId: number): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data?.user_id || null;
}

/* Send a message to a user's linked Telegram chat (if linked + enabled). */
export async function notifyUser(
  userId: string,
  text: string,
  opts?: { force?: boolean }
): Promise<boolean> {
  const supabase = createClient();
  const { data: link } = await supabase
    .from("telegram_links")
    .select("chat_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!link) return false;
  if (!opts?.force) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("telegram_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!settings?.telegram_enabled) return false;
  }
  return sendTelegram(link.chat_id, text);
}