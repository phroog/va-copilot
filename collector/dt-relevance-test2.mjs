// Reddit .json from a real browser tab context (via CDP) — test if content-script fetch works.
import { chromium } from "playwright";
const CDP = "http://127.0.0.1:9222";

const POSITIVE = [
  "virtual assistant", "executive assistant", "personal assistant", "administrative assistant",
  "admin support", "administrative", "office assistant", "remote assistant", "front desk",
  "receptionist", "secretary", "scheduler", "calendar management", "email management",
  "inbox management", "inbox", "document management",
  "appointment setter", "cold call", "telemarketing", "lead generation", "lead gen",
  "outbound", "sales representative", "sales rep", "inside sales", "b2b sales",
  "commission", "virtual receptionist", "call center",
  "data entry", "data processing", "list building", "research assistant", "online research",
  "web research", "transcription", "transcribe", "typing", "copy paste", "document",
  "bookkeep", "account", "quickbooks", "xero", "invoicing", "payroll", "reconciliation",
  "ap/ar", "accounts payable", "accounts receivable",
  "customer service", "customer support", "support agent", "help desk", "live chat",
  "technical support", "intake coordinator", "care coordinator",
  "social media", "instagram", "facebook", "tiktok", "content creator", "community manager",
  "smm", "video editor", "video editing", "premiere", "after effects", "motion graphics",
  "reels", "content writer", "copywriter", "ghostwriter", "blog", "article", "proofread",
  "editor", "thumbnail", "translation", "translate",
  "graphic design", "photoshop", "illustrator", "canva", "logo design",
  "email marketing", "seo", "digital marketing", "project management", "asana", "trello",
  "coordinator", "ghl", "go high level",
];
const NEG = [
  /(\bsenior\b|\bsr\.?)\s+(engineer|developer|architect|devops|data scientist|data engineer|backend|frontend|full[ -]?stack)/i,
  /\b(full[ -]?stack|backend|frontend|devops|site reliability|machine learning|data scientist|data engineer|blockchain)\b/i,
  /\bsoftware (engineer|developer|architect)\b/i,
  /\b(android|ios|react native|flutter)\s+developer\b/i,
  /\bweb developer\b|\bweb development\b/i,
  /\bnative\s+(german|french|spanish|italian|croatian|dutch|portuguese|japanese|korean|chinese|arabic|russian|swedish|norwegian|danish|polish|turkish|hungarian|romanian|greek|hebrew|thai|vietnamese|indonesian|filipino|tagalog|hindi)\b/i,
  /\b(croatian|dutch|swedish|norwegian|danish|finnish|polish|czech|greek|hebrew|thai|vietnamese|indonesian|filipino|tagalog)\s*[- ]?(speaking|speaker|language)\b/i,
  /\b(subject matter expert|sme)\b/i,
  /\bph\.?d\.?|postdoc\b/i,
  /\b(medical doctor|attorney|lawyer|licensed\s+(electrical|mechanical|civil|structural|software)\s+engineer)\b/i,
  /\b(us|usa|united states|uk|australia|canada)\s*(citizens?|residents?|applicants?)\b/i,
  /\bonly\s+(us|usa|united states|uk|australia|canada|german|germany|european|eu)\s*(citizens?|residents?|based)?\b/i,
  /\bmust\s+be\s+(located|based)\s+in\s+(the\s+)?(us|usa|united states|uk|australia|canada)\b/i,
];
function relevant(job) {
  const text = [job.title || "", job.description || "", (job.skills || []).join(" ")].join(" ").toLowerCase();
  const inPositive = POSITIVE.some((kw) => text.includes(kw));
  if (!inPositive) return false;
  return !NEG.some((re) => re.test(text));
}

const SAMPLES = {
  upwork: ["Virtual Assistant for Inbox Management", "B2B Appointment Setter", "Research Assistant: LOCAL BUSINESS LIST BUILDING", "Video Editor for Matcha Platform", "ClickHouse SENIOR Experts", "Pair Recording for Native German Speakers", "Croatian-speaking B2B sales closer", "Managing references with Zotero", "Microsoft Visio Stencil Development", "Graphic designer shoe products"],
  onlinejobs: ["Virtual Appointment Setter", "GHL/Video Editor/Admin VA", "Virtual Assistant for Mental Health Practice", "Healthcare Virtual Administrative Assistant", "Admin Work", "Remote Accountant", "Amazon Senior PPC Auditor", "Video Editor Long Form"],
  guru: ["Licensed CPA Needed for Attestation", "Cross-Site UX / Product Flow Master", "HealthCentreApp Full-Stack Development", "Medical & Healthcare SME", "Entry Level GHL Developer", "WordPress Web Developer"],
  freelancer: ["Excel Data Entry & Line Charts", "Instagram Reels & Music Editing", "Beta Test SaaS US applicants only", "Monte Carlo Sizing & BIBD Randomization", "Social Media Spezialist gesucht"],
};
for (const [plat, titles] of Object.entries(SAMPLES)) {
  console.log(`\n${plat}:`);
  titles.forEach((t) => console.log(`   ${relevant({ title: t }) ? "KEEP" : "DROP"}  ${t}`));
}

// Reddit via real browser tab context
let browser;
try {
  browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0];
  let page = (context.pages() || []).find((p) => /reddit\.com/.test(p.url() || ""));
  if (!page) {
    page = await context.newPage();
    await page.goto("https://www.reddit.com/r/virtualassistants/new/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  const res = await page.evaluate(async () => {
    try {
      const r = await fetch("https://www.reddit.com/r/virtualassistants/new.json?limit=5", { credentials: "include" });
      const t = await r.text();
      let titles = [];
      try { titles = (JSON.parse(t).data.children || []).map((c) => c.data.title); } catch {}
      return { status: r.status, ct: r.headers.get("content-type"), titles };
    } catch (e) { return { status: "ERR", err: e.message }; }
  });
  console.log("\nREDDIT browser-context:", JSON.stringify(res, null, 1));
} catch (e) {
  console.log("CDP err", e.message.split("\n")[0]);
} finally {
  if (browser) await browser.close().catch(() => {});
}
