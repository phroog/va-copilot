import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegram } from "@/lib/telegram";
import { formatMoney, convert, normalizeCurrency } from "@/lib/currency";

export const runtime = "nodejs";

/* Triggered by Vercel Cron (every 30 min). For every user with Telegram linked
   + enabled, pushes new matching jobs and due/overdue follow-ups. */
export async function GET() {
  const supabase = createClient();
  const { data: links } = await supabase
    .from("telegram_links")
    .select("user_id, chat_id");

  let sent = 0;
  for (const link of links ?? []) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("telegram_enabled, telegram_push_matches, telegram_push_followups")
      .eq("user_id", link.user_id)
      .maybeSingle();

    if (!settings?.telegram_enabled) continue;
    const messages: string[] = [];

    // ── New matching jobs ─────────────────────────────────────────
    if (settings.telegram_push_matches) {
      const pushed = await getPushedIds(link.user_id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("job_vector")
        .eq("user_id", link.user_id)
        .maybeSingle();

      const { data: jobs } = await supabase
        .from("global_jobs")
        .select("id, title, platform, budget, profile_vector")
        .order("posted_at", { ascending: false })
        .limit(30);

      const fresh = (jobs ?? [])
        .filter((j) => !pushed.has(j.id))
        .map((j) => {
          const vec = Array.isArray(j.profile_vector) ? j.profile_vector : null;
          const pvec = profile?.job_vector;
          if (!vec || !Array.isArray(pvec)) return { ...j, match: 0 };
          const dot = vec.reduce((s, v, i) => s + v * (pvec[i] || 0), 0);
          return { ...j, match: Math.round((dot / 125) * 100) };
        })
        .filter((j) => j.match >= 70)
        .slice(0, 3);

      if (fresh.length > 0) {
        const lines = ["🎯 <b>New matches for you:</b>\n"];
        for (const j of fresh) {
          lines.push(`<b>${j.title}</b> (${j.match}%)\n${j.platform} · ${j.budget || "n/a"}\n`);
          await markPushed(link.user_id, j.id);
        }
        messages.push(lines.join("\n"));
      }
    }

    // ── Due / overdue follow-ups ──────────────────────────────────
    if (settings.telegram_push_followups) {
      const { data: followUps } = await supabase
        .from("follow_ups")
        .select("id, action, due_date")
        .eq("user_id", link.user_id)
        .eq("status", "pending");

      const now = Date.now();
      const due = (followUps ?? []).filter((f) => {
        const d = new Date(f.due_date).getTime();
        return !isNaN(d) && d - now <= 0; // today or overdue
      });

      if (due.length > 0) {
        const lines = ["⏰ <b>Due follow-ups:</b>\n"];
        for (const f of due.slice(0, 5)) {
          lines.push(`• ${f.action} (${new Date(f.due_date).toLocaleDateString()})`);
        }
        messages.push(lines.join("\n"));
      }
    }

    if (messages.length > 0) {
      const ok = await sendTelegram(link.chat_id, messages.join("\n\n"));
      if (ok) sent++;
    }
  }

  return NextResponse.json({ sent });
}

/* Track which job ids were already pushed per user (in-memory is not enough
   across cron runs; use a small table via telegram link row is complex, so we
   keep a lightweight JSONB on user_settings). */
const PUSHED_KEY = "telegram_pushed_jobs";

async function getPushedIds(userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase.from("user_settings").select(PUSHED_KEY).eq("user_id", userId).maybeSingle();
  const raw = (data as any)?.[PUSHED_KEY];
  return new Set(Array.isArray(raw) ? raw : []);
}

async function markPushed(userId: string, jobId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("user_settings").select(PUSHED_KEY).eq("user_id", userId).maybeSingle();
  const arr = Array.isArray((data as any)?.[PUSHED_KEY]) ? (data as any)[PUSHED_KEY] : [];
  arr.push(jobId);
  await supabase
    .from("user_settings")
    .update({ [PUSHED_KEY]: arr.slice(-50) })
    .eq("user_id", userId);
}