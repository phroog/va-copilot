import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { accuracyTier, speedTier } from "@/lib/learn/performance";
import { planFromSubscription } from "@/lib/learn/energy";

const MAX_ITEMS = 24;

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0 && s.length <= 140)
    .slice(0, MAX_ITEMS);
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,xp,streak_count,badge_activities,badge_projects,badge_tagline,public_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Ensure a shareable public id exists.
  let publicId = profile?.public_id ?? null;
  if (!publicId) {
    publicId = "user_" + crypto.randomUUID().split("-")[0].slice(0, 8);
    await supabase.from("profiles").update({ public_id: publicId }).eq("user_id", user.id);
  }

  const { data: sub } = await supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle();
  const plan = planFromSubscription(sub);

  const { data: agg } = await supabase
    .from("learn_progress")
    .select("best_accuracy,best_speed_ratio")
    .eq("user_id", user.id)
    .eq("status", "completed");

  const rows = agg ?? [];
  const lessonsDone = rows.length;
  const avgAccuracy = lessonsDone > 0 ? rows.reduce((s, r) => s + Number(r.best_accuracy ?? 0), 0) / lessonsDone : 0;
  const bestRatio = lessonsDone > 0 ? Math.min(...rows.map((r) => Number(r.best_speed_ratio ?? 1.5))) : 1.5;

  const xp = profile?.xp ?? 0;
  const xpInfo = summarizeXp(xp);

  return NextResponse.json({
    profile: {
      name: profile?.full_name || user.email?.split("@")[0] || "Virtual Assistant",
      xp,
      streak: profile?.streak_count ?? 0,
      publicId,
      tagline: profile?.badge_tagline ?? "",
      plan,
      verified: plan === "pro",
      scout: plan === "pro" ? "top" : plan === "basic" ? "pool" : "none",
      rank: xpInfo,
    },
    portfolio: {
      activities: (profile?.badge_activities ?? []) as string[],
      projects: (profile?.badge_projects ?? []) as string[],
    },
    stats: {
      lessonsDone,
      avgAccuracy,
      bestSpeedTier: speedTier(bestRatio).key,
      bestAccuracyTier: accuracyTier(avgAccuracy).key,
      masteredPct: null as number | null,
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (body.activities !== undefined) update.badge_activities = cleanList(body.activities);
  if (body.projects !== undefined) update.badge_projects = cleanList(body.projects);
  if (typeof body.tagline === "string") update.badge_tagline = body.tagline.trim().slice(0, 80);

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("user_id", user.id)
    .select("badge_activities,badge_projects,badge_tagline")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    portfolio: {
      activities: (data?.badge_activities ?? []) as string[],
      projects: (data?.badge_projects ?? []) as string[],
      tagline: (data?.badge_tagline ?? "") as string,
    },
  });
}