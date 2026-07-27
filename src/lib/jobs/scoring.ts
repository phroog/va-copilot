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
export function computeScore(job: Record<string, any>, profile: Record<string, any>): { score: number; match_reason: string; breakdown: { label: string; score: number; max: number }[] } {
  const reasons: string[] = [];
  const breakdown: { label: string; score: number; max: number }[] = [];
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
  let skillScore = 0;
  if (userSkills.length > 0) {
    const tokens = jobText.split(/[\s,.-]+/).filter(Boolean);
    const matched = userSkills.filter((skill) => {
      const skillWords = skill.split(/[\s]+/).filter(Boolean);
      return skillWords.some((w) => tokens.includes(w)) || jobText.includes(skill);
    });
    skillScore = (matched.length / userSkills.length) * 40;
    total += skillScore;
    if (matched.length > 0) {
      reasons.push(`Matches ${matched.length}/${userSkills.length} of your skills`);
    } else {
      reasons.push("No skill overlap");
    }
  }
  breakdown.push({ label: "Skill overlap", score: Math.round(skillScore), max: 40 });

  /* ── Budget match (30%) ──────────────────────────────────────── */
  let budgetScore = 0;
  if (userRate > 0) {
    const jobBudgetStr = [job.budget || "", job.budget_amount || ""].join(" ");
    const rateMatch = jobBudgetStr.match(/\$?(\d+(?:\.\d+)?)\s*(?:\/hr|\/ hour|per hour)?/i);
    if (rateMatch) {
      const jobRate = parseFloat(rateMatch[1]);
      if (!isNaN(jobRate) && jobRate > 0) {
        const ratio = jobRate / userRate;
        if (ratio >= 1) {
          budgetScore = 30;
          reasons.push("Budget meets/exceeds your desired rate");
        } else if (ratio >= 0.8) {
          budgetScore = 18;
          reasons.push("Budget within 80% of your desired rate");
        } else {
          budgetScore = 6;
          reasons.push("Budget below your desired rate");
        }
      }
    }
  }
  total += budgetScore;
  breakdown.push({ label: "Budget match", score: budgetScore, max: 30 });

  /* ── Category match (20%) ────────────────────────────────────── */
  let catScore = 0;
  if (userCategories.length > 0) {
    let matchedCategories = 0;
    for (const cat of userCategories) {
      const keywords = CATEGORY_KEYWORDS[cat] || [cat];
      if (keywords.some((kw) => jobText.includes(kw.toLowerCase()))) {
        matchedCategories++;
      }
    }
    catScore = (matchedCategories / userCategories.length) * 20;
    total += catScore;
    if (matchedCategories > 0) {
      reasons.push(`Fits ${matchedCategories}/${userCategories.length} of your categories`);
    }
  }
  breakdown.push({ label: "Category match", score: Math.round(catScore), max: 20 });

  /* ── Platform bonus (10%) ────────────────────────────────────── */
  let platformScore = 0;
  const platform = (job.platform || "").toLowerCase();
  if (platform.includes("upwork") || platform.includes("onlinejobs")) {
    platformScore = 10;
  } else if (platform.includes("linkedin") || platform.includes("facebook")) {
    platformScore = 5;
  }
  total += platformScore;
  breakdown.push({ label: "Platform bonus", score: platformScore, max: 10 });

  const score = Math.round(Math.min(100, Math.max(0, total)));
  return { score, match_reason: reasons.join("; ") || "No matching data available", breakdown };
}
