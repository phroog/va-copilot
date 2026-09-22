// Server-only Daily Energy helpers (Duolingo-style plan limits).
// FREE: 1 lesson/day, no client sim, no leaderboard rank, badge paused.
// BLOOM: 2 lessons/day + 5 sim scenarios/day, ranked, scout pool.
// Money Club: unlimited everything, top scout pool, verified badge.

export type PlanKey = "free" | "basic" | "pro";

export interface EnergyState {
  plan: PlanKey;
  today: string;
  lessonsUsed: number;
  simUsed: number;
  bonusLessons: number;
  lessonsLimit: number;
  simLimit: number;
  lessonsLeft: number;
  simLeft: number;
}

const utcToday = () => new Date().toISOString().slice(0, 10);

export function planFromSubscription(sub: { plan?: string | null; status?: string | null; access_until?: string | null } | null): PlanKey {
  if (!sub) return "free";
  const active = sub.status === "active" || sub.status === "trialing";
  const notExpired = !sub.access_until || new Date(sub.access_until).getTime() > Date.now();
  if (active && notExpired && sub.plan === "pro") return "pro";
  if (active && notExpired && sub.plan === "basic") return "basic";
  return "free";
}

export const ENERGY_LIMITS: Record<PlanKey, { lessons: number; sim: number }> = {
  free: { lessons: 1, sim: 0 },
  basic: { lessons: 2, sim: 5 },
  pro: { lessons: Infinity, sim: Infinity },
};

// Resets the daily counters when the UTC date rolled over.
export async function ensureDaily(supabase: any, userId: string): Promise<void> {
  const today = utcToday();
  const { data: p } = await supabase.from("profiles").select("daily_date").eq("user_id", userId).maybeSingle();
  if (p?.daily_date !== today) {
    await supabase
      .from("profiles")
      .update({ daily_date: today, lessons_today: 0, sim_today: 0, bonus_lessons_today: 0 })
      .eq("user_id", userId);
  }
}

export async function getEnergy(supabase: any, userId: string): Promise<EnergyState> {
  const today = utcToday();
  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_date,lessons_today,sim_today,bonus_lessons_today")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: sub } = await supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", userId).maybeSingle();

  const plan = planFromSubscription(sub);
  const stale = profile?.daily_date !== today;
  const lessonsUsed = stale ? 0 : profile?.lessons_today ?? 0;
  const simUsed = stale ? 0 : profile?.sim_today ?? 0;
  const bonusLessons = stale ? 0 : profile?.bonus_lessons_today ?? 0;

  const base = ENERGY_LIMITS[plan];
  const lessonsLimit = plan === "pro" ? Infinity : base.lessons + bonusLessons;
  const simLimit = base.sim;

  return {
    plan,
    today,
    lessonsUsed,
    simUsed,
    bonusLessons,
    lessonsLimit,
    simLimit,
    lessonsLeft: lessonsLimit === Infinity ? Infinity : Math.max(0, lessonsLimit - lessonsUsed),
    simLeft: simLimit === Infinity ? Infinity : Math.max(0, simLimit - simUsed),
  };
}

export async function consumeLessons(supabase: any, userId: string, n = 1): Promise<void> {
  await ensureDaily(supabase, userId);
  const { data: p } = await supabase.from("profiles").select("lessons_today").eq("user_id", userId).maybeSingle();
  await supabase.from("profiles").update({ lessons_today: (p?.lessons_today ?? 0) + n }).eq("user_id", userId);
}

export async function consumeSimScenarios(supabase: any, userId: string, n: number): Promise<void> {
  if (n <= 0) return;
  await ensureDaily(supabase, userId);
  const { data: p } = await supabase.from("profiles").select("sim_today").eq("user_id", userId).maybeSingle();
  await supabase.from("profiles").update({ sim_today: (p?.sim_today ?? 0) + n }).eq("user_id", userId);
}

// Adds `n` extra lesson slots for today (used by the wheel).
export async function grantBonusLessons(supabase: any, userId: string, n: number): Promise<void> {
  await ensureDaily(supabase, userId);
  const { data: p } = await supabase.from("profiles").select("bonus_lessons_today").eq("user_id", userId).maybeSingle();
  const cur = p?.bonus_lessons_today ?? 0;
  await supabase.from("profiles").update({ bonus_lessons_today: cur + n }).eq("user_id", userId);
}