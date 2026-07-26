import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ── Category keywords ────────────────────────────────────────── */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Admin Support": ["admin", "administrative", "data entry", "scheduling", "email management", "calendar", "virtual assistant"],
  "Graphic Design": ["graphic design", "photoshop", "illustrator", "canva", "design", "logo", "ui", "ux"],
  "Web Development": ["web developer", "frontend", "backend", "full stack", "react", "node", "python", "javascript", "html", "css"],
  "Writing": ["writing", "content", "blog", "copywriting", "article", "editor", "proofreading"],
  "Social Media": ["social media", "instagram", "facebook", "tiktok", "twitter", "content creator", "community manager"],
  "Customer Support": ["customer support", "customer service", "support agent", "help desk", "technical support", "live chat"],
  "Video Editing": ["video editing", "video editor", "premiere", "after effects", "motion graphics", "animation"],
  "Marketing": ["marketing", "seo", "digital marketing", "email marketing", "campaign", "growth"],
  "Bookkeeping": ["bookkeeping", "accounting", "quickbooks", "xero", "invoicing", "payroll"],
  "Project Management": ["project management", "asana", "trello", "jira", "coordinator", "scrum"],
};

/* ── Scoring logic ────────────────────────────────────────────── */
function computeScore(job: Record<string, any>, profile: Record<string, any>): { score: number; match_reason: string } {
  const reasons: string[] = [];
  let total = 0;

  const jobText = [
    job.title || "",
    job.description || "",
    (job.skills || []).join(" "),
  ].join(" ").toLowerCase();

  const userSkills: string[] = (profile.skills || []).map((s: string) => s.toLowerCase().trim()).filter(Boolean);
  const userRate = parseFloat((profile.desired_rate || "").replace(/[^0-9.]/g, ""));
  const userCategories: string[] = (profile.job_categories || []).map((c: string) => c.toLowerCase().trim()).filter(Boolean);

  /* ── Skill overlap (40%) ─────────────────────────────────────── */
  if (userSkills.length > 0) {
    const tokens = jobText.split(/[\s,.-]+/).filter(Boolean);
    const matched = userSkills.filter((skill) => {
      const skillWords = skill.split(/[\s]+/).filter(Boolean);
      return skillWords.some((w) => tokens.includes(w)) || jobText.includes(skill);
    });
    const skillScore = (matched.length / userSkills.length) * 40;
    total += skillScore;
    if (matched.length > 0) {
      reasons.push(`Matches ${matched.length}/${userSkills.length} of your skills`);
    } else {
      reasons.push("No skill overlap");
    }
  }

  /* ── Budget match (30%) ──────────────────────────────────────── */
  if (userRate > 0) {
    const jobBudgetStr = [job.budget || "", job.budget_amount || ""].join(" ");
    const rateMatch = jobBudgetStr.match(/\$?(\d+(?:\.\d+)?)\s*(?:\/hr|\/ hour|per hour)?/i);
    if (rateMatch) {
      const jobRate = parseFloat(rateMatch[1]);
      if (!isNaN(jobRate) && jobRate > 0) {
        const ratio = jobRate / userRate;
        if (ratio >= 1) {
          total += 30;
          reasons.push("Budget meets/exceeds your desired rate");
        } else if (ratio >= 0.8) {
          total += 18;
          reasons.push("Budget within 80% of your desired rate");
        } else {
          total += 6;
          reasons.push("Budget below your desired rate");
        }
      }
    }
  }

  /* ── Category match (20%) ────────────────────────────────────── */
  if (userCategories.length > 0) {
    let matchedCategories = 0;
    for (const cat of userCategories) {
      const keywords = CATEGORY_KEYWORDS[cat] || [cat];
      if (keywords.some((kw) => jobText.includes(kw.toLowerCase()))) {
        matchedCategories++;
      }
    }
    const catScore = (matchedCategories / userCategories.length) * 20;
    total += catScore;
    if (matchedCategories > 0) {
      reasons.push(`Fits ${matchedCategories}/${userCategories.length} of your categories`);
    }
  }

  /* ── Platform bonus (10%) ────────────────────────────────────── */
  const platform = (job.platform || "").toLowerCase();
  if (platform.includes("upwork") || platform.includes("onlinejobs")) {
    total += 10;
  } else if (platform.includes("linkedin") || platform.includes("facebook")) {
    total += 5;
  }

  const score = Math.round(Math.min(100, Math.max(0, total)));
  return { score, match_reason: reasons.join("; ") || "No matching data available" };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { jobs } = body;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json({ error: "Jobs array is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("skills, desired_rate, experience_level, job_categories")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found. Set up your skills in Settings first." }, { status: 404 });
  }

  const scored = jobs.map((job: Record<string, any>) => {
    const { score, match_reason } = computeScore(job, profile);
    return { ...job, score, match_reason };
  });

  return NextResponse.json({ jobs: scored });
}

/* Exported for reuse in single-job scoring */
export { computeScore };
