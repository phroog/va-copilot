/* ── 5-dimensional job/user fingerprint (deterministic, no AI) ──────────
 *
 * Every job and every user is reduced to the same fixed vector of 5 numbers
 * (each 1–5). The match between a user and a job is how close the numbers are
 * per axis: identical vectors = 100%, opposite vectors (1 vs 5 everywhere) = 0%.
 *
 * Axes:
 *   1. erfahrung    – required experience: 1 entry … 5 expert
 *   2. technik      – technical depth:    1 pure admin … 5 developer/engineer
 *   3. kundenkontakt– client-facing:      1 back-office … 5 sales/phone
 *   4. auslastung   – workload:           1 one-off gig … 5 full-time
 *   5. budget       – rate tier:          1 low … 5 premium
 */

export const VECTOR_AXES = [
  { key: "erfahrung", label: "Erfahrung", min: 1, max: 5 },
  { key: "technik", label: "Technik", min: 1, max: 5 },
  { key: "kundenkontakt", label: "Kundenkontakt", min: 1, max: 5 },
  { key: "auslastung", label: "Auslastung", min: 1, max: 5 },
  { key: "budget", label: "Budget", min: 1, max: 5 },
];

export type Vector = [number, number, number, number, number];

/* Neutral fallback used when a user has not set up their profile vector yet —
   keeps the feed/matching functional instead of showing everything as "no match". */
export const NEUTRAL_JOB_VECTOR: Vector = [3, 3, 3, 3, 3];

export function clamp1to5(v: number): number {
  if (!Number.isFinite(v)) return 3;
  return Math.max(1, Math.min(5, Math.round(v)));
}

export function validateUserVector(input: unknown): Vector | null {
  if (!Array.isArray(input) || input.length !== 5) return null;
  const out = input.map((x) => (typeof x === "number" ? clamp1to5(x) : Number(x)));
  if (out.some((x) => !Number.isFinite(x))) return null;
  return out as Vector;
}

/* ── Job classification (rules only, deterministic) ─────────────────── */

export function classifyJobVector(job: Record<string, any>): { vector: Vector; labels: string[] } {
  const text = [job.title || "", job.description || "", (job.skills || []).join(" ")]
    .join(" ")
    .toLowerCase();
  const level = String(job.experience_level || job.experienceLevel || "").toLowerCase();
  const budget = [job.budget || "", job.budget_amount || "", job.budgetAmount || ""]
    .filter(Boolean)
    .join(" ");

  /* 1. Experience */
  let exp = 3;
  if (/entry|beginner|junior|no experience/i.test(level) || /\bentry[- ]level\b|junior|beginner/i.test(text)) exp = 1;
  else if (/expert/i.test(level) || /5\+ years|10\+ years|principal|architect|ph\.?d/i.test(text)) exp = 5;
  else if (/senior/i.test(level) || /\bsenior\b/i.test(text)) exp = 4;
  else if (/intermediate|mid[- ]level/i.test(level) || /experienced|2[- ]4 years/i.test(text)) exp = 3;
  else if (/basic|light|simple/i.test(text)) exp = 2;

  /* 2. Technical depth */
  let tech = 2;
  if (/\b(developer|programming|software|full[- ]?stack|backend|frontend|data scientist|machine learning|python|javascript|react|node|cad|engineering|cloud|aws|devops|blockchain|mysql|sql)\b/.test(text)) tech = 5;
  else if (/\b(photoshop|illustrator|after effects|premiere|motion graphics|video editing|video editor|wordpress|ghl|go high level|automation|excel|google sheets|zapier|seo|email marketing)\b/.test(text)) tech = 4;
  else if (/\b(social media|content|blog|article|copywrit|writing|translation|graphic design|canva|design|logo)\b/.test(text)) tech = 3;
  else if (/\b(customer service|customer support|email|inbox|reception|help desk|office|front desk)\b/.test(text)) tech = 2;
  else if (/\b(admin|virtual assistant|scheduling|calendar|data entry|transcri|document|typing|list building|research)\b/.test(text)) tech = 1;

  /* 3. Client-facing */
  let contact = 2;
  if (/\b(cold call|telemarketing|appointment setter|b2b sales|inside sales|sales rep|outbound|phone)\b/.test(text)) contact = 5;
  else if (/\b(customer service|customer support|support agent|live chat|help desk|reception|client[- ]facing|intake)\b/.test(text)) contact = 4;
  else if (/\b(email|inbox|schedul|social media|community manager|sales)\b/.test(text)) contact = 3;
  else if (/\b(data entry|transcri|document|list building|typing|research|virtual assistant|admin)\b/.test(text)) contact = 1;

  /* 4. Workload */
  let load = 3;
  if (/\b(full[- ]time|40 hours|8 hours a day|full time)\b/.test(text)) load = 5;
  else if (/\b(30 hours|30 hrs|full[- ]time)\b/.test(text)) load = 4;
  else if (/\b(part[- ]time|20 hours|20 hrs|flexible)\b/.test(text)) load = 3;
  else if (/\b(10 hours|10 hrs|few hours|light)\b/.test(text)) load = 2;
  else if (/\b(gig|one[- ]time|as needed|project[- ]based|5 hours)\b/.test(text)) load = 1;

  /* 5. Budget tier */
  let bud = 2;
  const num = budget.match(/\$?\s?(\d+(?:\.\d+)?)/);
  if (num) {
    const v = parseFloat(num[1]);
    if (/hr|hour/i.test(budget)) {
      if (v < 5) bud = 1;
      else if (v < 15) bud = 2;
      else if (v < 25) bud = 3;
      else if (v < 45) bud = 4;
      else bud = 5;
    } else {
      if (v < 200) bud = 1;
      else if (v < 1000) bud = 2;
      else if (v < 3000) bud = 3;
      else if (v < 10000) bud = 4;
      else bud = 5;
    }
  }

  const vector: Vector = [exp, tech, contact, load, bud];
  return { vector, labels: VECTOR_AXES.map((a) => a.key) };
}

/* ── Match ──────────────────────────────────────────────────────────── */

/* Not all axes are equally important. "Technik" (the role axis) dominates;
   a pure-VA user should not get a high match for a social-media editor or a
   developer job. Kundenkontakt also matters (phone/sales vs back-office). */
const AXIS_WEIGHTS = [0.15, 0.35, 0.15, 0.10, 0.10]; // erfahrung, technik, kundenkontakt, auslastung, budget
const WEIGHT_SUM = AXIS_WEIGHTS.reduce((a, b) => a + b, 0);

export function matchVectors(userVec: Vector, jobVec: Vector): { score: number; perAxis: number[] } {
  const perAxis = jobVec.slice(0, 5).map((jv, i) => {
    const close = 1 - Math.abs(jv - (userVec[i] ?? 0)) / 4; // 1 = identical, 0 = opposite
    return Math.max(0, Math.min(1, close));
  });

  let score = perAxis.reduce((s, close, i) => s + close * AXIS_WEIGHTS[i], 0);
  score = (score / WEIGHT_SUM) * 100;

  // Role gate: big mismatches on Technik or Kundenkontakt should disqualify.
  const techDiff = Math.abs((userVec[1] ?? 0) - (jobVec[1] ?? 0));
  const contactDiff = Math.abs((userVec[2] ?? 0) - (jobVec[2] ?? 0));
  const worst = Math.max(techDiff, contactDiff);
  if (worst >= 4) score *= 0.15;
  else if (worst >= 3) score *= 0.3;
  else if (worst >= 2) score *= 0.6;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    perAxis: perAxis.map((c) => Math.round(c * 100)),
  };
}
