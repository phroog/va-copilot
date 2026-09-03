import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { matchVectors, validateUserVector, classifyJobVector } from "@/lib/jobs/profile-vector";
import { effectivePlan, AUTO_GRANT_THRESHOLD } from "@/lib/payments";
import { sendTelegram } from "@/lib/telegram";

export const runtime = "nodejs";

/* POST /api/telegram/realtime
 * Called by the Supabase DB trigger (pg_net → net.http_post) whenever a new
 * row is inserted into global_jobs (or follow_ups). No cron involved — this is
 * a true realtime push.
 *
 * Security: the trigger signs the request with `Authorization: Bearer
 * <app.telegram_push_secret>`. We compare it against TELEGRAM_PUSH_SECRET.
 */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_PUSH_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: any;
  try {
    const body = await request.json();
    payload = body?.record || body?.job || body;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceRoleClient();

  // ── Follow-up reminder (INSERT on follow_ups) ────────────────────
  if (payload?.due_date && payload?.user_id) {
    const due = new Date(payload.due_date);
    if (!isNaN(due.getTime())) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("telegram_enabled, telegram_push_followups")
        .eq("user_id", payload.user_id)
        .maybeSingle();
      if (settings?.telegram_enabled && settings.telegram_push_followups === true) {
        const { data: link } = await supabase
          .from("telegram_links")
          .select("chat_id")
          .eq("user_id", payload.user_id)
          .maybeSingle();
        if (link) {
          const action = payload.action || payload.job_id || "Follow-up";
          await sendTelegram(link.chat_id, `⏰ <b>Follow-up due</b>\n\n${action} (by ${payload.due_date})`);
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  const jobId = payload?.id;
  if (!jobId) return NextResponse.json({ ok: true });

  // Dedup: only push freshly inserted jobs (the collector can bulk-insert old
  // rows on a backfill; skip those).
  const collected = payload?.collected_at || payload?.posted_at || new Date().toISOString();
  if (Date.now() - new Date(collected).getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: "old" });
  }

  const jobVec: any = Array.isArray(payload.profile_vector)
    ? payload.profile_vector
    : classifyJobVector(payload).vector;
  const title = payload.title || "";
  const platform = payload.platform || "";
  const budget = payload.budget || "";
  const url = payload.url || "";

  // All users with Telegram linked.
  const { data: links } = await supabase
    .from("telegram_links")
    .select("user_id, chat_id");

  let sent = 0;
  for (const link of links || []) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("telegram_enabled, telegram_push_matches, telegram_pushed_jobs")
      .eq("user_id", link.user_id)
      .maybeSingle();
    if (!settings?.telegram_enabled || settings.telegram_push_matches !== true) continue;

    // Dedup: don't push the same job twice.
    const pushed = Array.isArray(settings.telegram_pushed_jobs) ? settings.telegram_pushed_jobs : [];
    if (pushed.includes(jobId)) continue;

    // Match score using the real 5-axis matcher.
    const { data: profile } = await supabase
      .from("profiles")
      .select("job_vector")
      .eq("user_id", link.user_id)
      .maybeSingle();
    const userVec = profile?.job_vector ? validateUserVector(profile.job_vector) : null;
    let match = 0;
    if (userVec) match = matchVectors(userVec, jobVec).score;

    // Only push jobs above the confident threshold.
    if (match < AUTO_GRANT_THRESHOLD) continue;

    // ── Pro-only: this realtime match push is a Money Club perk. ─────
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, access_until")
      .eq("user_id", link.user_id)
      .maybeSingle();
    if (effectivePlan(sub) !== "pro") continue;

    const text =
      `🎯 <b>New match for you!</b>\n\n` +
      `<b>${title}</b> (${match}%)\n${platform} · ${budget || "n/a"}` +
      (url ? `\n<a href="${url}">Open job ↗</a>` : "");
    const ok = await sendTelegram(link.chat_id, text);
    if (ok) {
      sent++;
      await supabase
        .from("user_settings")
        .update({ telegram_pushed_jobs: [...pushed, jobId].slice(-50) })
        .eq("user_id", link.user_id);
    }
  }

  return NextResponse.json({ ok: true, sent });
}