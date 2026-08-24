// Supabase Edge Function: real-time Telegram push.
// Triggered via pg_net HTTP POST when a new global_job is inserted.
// Matches the job against each user's profile and sends an instant
// notification (matching is also gated by user prefs + dedup).

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const secret = Deno.env.get("TELEGRAM_PUSH_SECRET");

  if (!SUPABASE_URL || !SERVICE_ROLE || !BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "missing env" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Optional shared secret between the DB trigger and this function.
  if (secret && req.headers.get("x-push-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // The payload is the inserted global_job row (from pg_net).
  let job;
  try {
    const body = await req.json();
    job = body?.record || body?.job || body;
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const jobId = job?.id;
  if (!jobId) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

  // Dedup: only push jobs newer than a few minutes (avoid re-pushing old rows
  // inserted by the collector in bulk).
  const collected = job?.collected_at || job?.posted_at || new Date().toISOString();
  if (Date.now() - new Date(collected).getTime() > 10 * 60 * 1000) {
    return new Response(JSON.stringify({ ok: true, skipped: "old" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const jobVec = Array.isArray(job.profile_vector) ? job.profile_vector : null;
  const title = job.title || "";
  const platform = job.platform || "";
  const budget = job.budget || "";

  // All users with Telegram linked + match push enabled.
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

    // Skip already-pushed
    const pushed = Array.isArray(settings.telegram_pushed_jobs) ? settings.telegram_pushed_jobs : [];
    if (pushed.includes(jobId)) continue;

    // Match score (5-axis dot product / 125)
    const { data: profile } = await supabase
      .from("profiles")
      .select("job_vector")
      .eq("user_id", link.user_id)
      .maybeSingle();
    const pvec = profile?.job_vector;
    let match = 0;
    if (jobVec && Array.isArray(pvec)) {
      const dot = jobVec.reduce((s, v, i) => s + v * (pvec[i] || 0), 0);
      match = Math.round((dot / 125) * 100);
    }
    if (match < 70) continue;

    const text = `🎯 <b>Neuer Match für dich!</b>\n\n<b>${title}</b> (${match}%)\n${platform} · ${budget || "k.A."}`;
    const ok = await sendTelegram(BOT_TOKEN, link.chat_id, text);
    if (ok) {
      sent++;
      await supabase
        .from("user_settings")
        .update({ telegram_pushed_jobs: [...pushed, jobId].slice(-50) })
        .eq("user_id", link.user_id);
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200, headers: { "Content-Type": "application/json" } });
});

function sendTelegram(token, chatId, text) {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).then((r) => r.ok).catch(() => false);
}
