import { categorizeJob } from "@/lib/jobs/scoring";

/**
 * Relevance filter for scraped jobs. Jobs that fail this check are deleted
 * instead of shown in the live feed (they are not useful for the typical
 * South-East-Asian WFH / VA / freelancer profile).
 *
 * A job is relevant when it matches a VA/WFH-oriented keyword (or a known
 * non-excluded category) and hits none of the hard-negative patterns
 * (senior engineering, non-English language locks, geo locks, SME/PhD ...).
 *
 * Tunable via RELEVANCE_EXCLUDE_CATEGORIES (comma separated, default
 * "Web Development"); set to "" to keep every known category.
 */

const EXCLUDE_CATEGORIES = (process.env.RELEVANCE_EXCLUDE_CATEGORIES ?? "Web Development")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/* VA / WFH / freelance-oriented terms. Substring match on title+description+skills. */
const POSITIVE_KEYWORDS = [
  // General admin / VA
  "virtual assistant", "executive assistant", "personal assistant", "administrative assistant",
  "admin support", "administrative", "office assistant", "remote assistant", "front desk",
  "receptionist", "secretary", "scheduler", "calendar management", "email management",
  "inbox management", "inbox", "document management", "admin work", "admin",
  // Sales / appointments / calling
  "appointment setter", "cold call", "telemarketing", "lead generation", "lead gen",
  "outbound", "sales representative", "sales rep", "inside sales", "b2b sales",
  "commission", "virtual receptionist", "call center",
  // Data / research
  "data entry", "data processing", "list building", "research assistant", "online research",
  "web research", "transcription", "transcribe", "typing", "copy paste", "document",
  // Bookkeeping / accounting
  "bookkeep", "account", "quickbooks", "xero", "invoicing", "payroll", "reconciliation",
  "ap/ar", "accounts payable", "accounts receivable", "cpa", "tax preparation",
  // Support
  "customer service", "customer support", "support agent", "help desk", "live chat",
  "technical support", "intake coordinator", "care coordinator",
  // Social media / content
  "social media", "instagram", "facebook", "tiktok", "content creator", "community manager",
  "smm", "video editor", "video editing", "premiere", "after effects", "motion graphics",
  "reels", "content writer", "copywriter", "ghostwriter", "blog", "article", "proofread",
  "editor", "thumbnail", "translation", "translate",
  // Creative
  "graphic design", "photoshop", "illustrator", "canva", "logo design",
  // Marketing / PM
  "email marketing", "seo", "digital marketing", "project management", "asana", "trello",
  "coordinator", "ghl", "go high level",
];

const NEGATIVE_PATTERNS: RegExp[] = [
  // Senior / heavy engineering roles
  /(\bsenior\b|\bsr\.?)\s+(engineer|developer|architect|devops|data scientist|data engineer|backend|frontend|full[ -]?stack)/i,
  /\b(full[ -]?stack|backend|frontend|devops|site reliability|machine learning|data scientist|data engineer|blockchain)\b/i,
  /\bsoftware (engineer|developer|architect)\b/i,
  /\b(android|ios|react native|flutter)\s+developer\b/i,
  /\bweb developer\b|\bweb development\b/i,
  /\b(system|network|database|it|linux|windows|sql|aws|azure|devops)\s+admin\w*\b/i,

  // Non-English native-language locks
  /\bnative\s+(german|french|spanish|italian|croatian|dutch|portuguese|japanese|korean|chinese|arabic|russian|swedish|norwegian|danish|polish|turkish|hungarian|romanian|greek|hebrew|thai|vietnamese|indonesian|filipino|tagalog|hindi)\b/i,
  /\b(croatian|dutch|swedish|norwegian|danish|finnish|polish|czech|greek|hebrew|thai|vietnamese|indonesian|filipino|tagalog)\s*[- ]?(speaking|speaker|language)\b/i,

  // Domain experts / academia
  /\b(subject matter expert|sme)\b/i,
  /\bph\.?d\.?|postdoc\b/i,
  /\b(medical doctor|attorney|lawyer|licensed\s+(electrical|mechanical|civil|structural|software)\s+engineer)\b/i,

  // Geographic restrictions
  /\b(us|usa|united states|uk|australia|canada)\s*(citizens?|residents?|applicants?)\b/i,
  /\bonly\s+(us|usa|united states|uk|australia|canada|german|germany|european|eu)\s*(citizens?|residents?|based)?\b/i,
  /\bmust\s+be\s+(located|based)\s+in\s+(the\s+)?(us|usa|united states|uk|australia|canada)\b/i,
];

export function isRelevantJob(job: Record<string, any>): boolean {
  const text = [
    job.title || "",
    job.description || "",
    (job.skills || []).join(" "),
  ].join(" ").toLowerCase();

  const category = categorizeJob(job);
  const inCategory =
    !!category && category !== "Other" && !EXCLUDE_CATEGORIES.includes(category.toLowerCase());
  const inPositive = POSITIVE_KEYWORDS.some((kw) => text.includes(kw));

  if (!inCategory && !inPositive) return false;
  return !NEGATIVE_PATTERNS.some((re) => re.test(text));
}
