import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail, layoutEmail } from "@/lib/email";
import { matchVectors, validateUserVector } from "@/lib/jobs/profile-vector";
import { effectivePlan, AUTO_GRANT_THRESHOLD } from "@/lib/payments";

export const runtime = "nodejs";

/* GET /api/emails/digest
 * Triggered by a Vercel cron once a day in the evening. Sends ONE overview
 * email to every Bloom (basic) + Money Club (pro) user who enabled email job
 * matches. Emails are the fallback channel — the digest is the only routine
 * email we send, so it stays quiet (no per-job spam).
 * Protected by x-admin-secret (same as the broadcast route). */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "";
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const dayStart = new Date().toISOString().slice(0, 10);

  // Everyone who asked for email job matches.
  const { data: prefs } = await supabase
    .from("user_settings")
    .select("user_id, notification_email")
    .eq("email_push_matches", true);

  let sent = 0;
  for (const p of prefs ?? []) {
    if (!p.user_id) continue;

    // Only Bloom + Money Club get the digest.
    const { data: sub } = await supabase.from("subscriptions").select("plan, status, access_until").eq("user_id", p.user_id).maybeSingle();
    const plan = effectivePlan(sub);
    if (plan !== "basic" && plan !== "pro") continue;

    // Resolve recipient.
    let to = p.notification_email || null;
    if (!to) {
      const { data: auth } = await supabase.auth.admin.getUserById(p.user_id);
      to = auth?.user?.email || null;
    }
    if (!to) continue;

    const { data: profile } = await supabase.from("profiles").select("job_vector, full_name").eq("user_id", p.user_id).maybeSingle();
    const userVec = profile?.job_vector ? validateUserVector(profile.job_vector) : null;
    if (!userVec) continue;

    // Today's fresh jobs, best matches first.
    const { data: jobs } = await supabase
      .from("global_jobs")
      .select("id, title, platform, budget, url, profile_vector, posted_at")
      .gte("collected_at", dayStart)
      .limit(200);

    const matches = (jobs ?? [])
      .map((j: any) => {
        const vec = Array.isArray(j.profile_vector) ? j.profile_vector : null;
        if (!vec) return null;
        const score = matchVectors(userVec, vec).score;
        return { ...j, score };
      })
      .filter((j: any) => j && j.score >= AUTO_GRANT_THRESHOLD)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    const name = profile?.full_name?.split(" ")[0] || "there";
    const rows = matches.length
      ? matches.map((j: any) => (
          `<tr>
             <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
               <a href="${j.url}" style="color:#6C4E8F;font-weight:700;text-decoration:none;">${j.title}</a>
               <div style="color:#64748b;font-size:12px;margin-top:2px;">${j.platform || ""} · ${j.budget || "n/a"} · <b>${j.score}% match</b></div>
             </td>
           </tr>`
        )).join("")
      : `<tr><td style="padding:10px 0;color:#94a3b8;">No high-confidence matches today. Better luck tomorrow! 🌱</td></tr>`;

    const html = layoutEmail(
      "Your daily job overview 🎯",
      `<p>Hey ${name},</p>
       <p>Here's today's overview — the best matching jobs we found for you:</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
       <p style="margin-top:16px;color:#64748b;font-size:13px;">
         Prefer instant alerts? Connect <b>Telegram</b> in Sari → Konfiguration for live pushes straight to your phone.
       </p>`
    );

    const ok = await sendEmail({ to, subject: `📋 Your daily Sari overview — ${matches.length} new match${matches.length === 1 ? "" : "es"}`, html });
    if (ok) sent++;
  }

  return NextResponse.json({ sent });
}