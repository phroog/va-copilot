// 1) Reddit public .json reachable?
const reddit = await fetch("https://www.reddit.com/r/virtualassistants/new.json?limit=5", {
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36", "accept": "application/json" },
}).catch((e) => ({ ok: false, err: e.message }));
if (reddit.ok) {
  const j = await reddit.json();
  const kids = (j?.data?.children || []).map((c) => c?.data?.title).filter(Boolean).slice(0, 5);
  console.log("REDDIT .json ->", reddit.status, "| posts:", kids.length);
  kids.forEach((t) => console.log("   -", t.slice(0, 80)));
} else {
  console.log("REDDIT FAIL:", reddit.status || reddit.err);
}

// 2) Relevance filter simulation against the collected samples
const CATEGORY_KEYWORDS = {
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
const EXCLUDE = new Set(["web development"]);
const NEG = [
  /(\bsenior\b|\bsr\.?)\s+(engineer|developer|architect|devops|data scientist|data engineer|backend|frontend|full[ -]?stack)/i,
  /\b(full[ -]?stack|backend|frontend|devops|site reliability|machine learning|data scientist|data engineer|blockchain)\b/i,
  /\bsoftware (engineer|developer|architect)\b/i,
  /\b(android|ios|react native|flutter)\s+developer\b/i,
  /\bnative\s+(german|french|spanish|italian|croatian|dutch|portuguese|japanese|korean|chinese|arabic|russian|swedish|norwegian|danish|polish|turkish|hungarian|romanian|greek|hebrew|thai|vietnamese|indonesian|filipino|tagalog|hindi)\b/i,
  /\b(croatian|dutch|swedish|norwegian|danish|finnish|polish|czech|greek|hebrew|thai|vietnamese|indonesian|filipino|tagalog)\s*[- ]?(speaking|speaker|language)\b/i,
  /\b(subject matter expert|sme)\b/i,
  /\bph\.?d\.?|postdoc\b/i,
  /\b(medical doctor|attorney|lawyer|licensed\s+(electrical|mechanical|civil|structural|software)\s+engineer)\b/i,
  /\b(us|usa|united states|uk|australia|canada)\s*(citizens?|residents?|applicants?)\b/i,
  /\bonly\s+(us|usa|united states|uk|australia|canada|german|germany|european|eu)\s*(citizens?|residents?|based)?\b/i,
  /\bmust\s+be\s+(located|based)\s+in\s+(the\s+)?(us|usa|united states|uk|australia|canada)\b/i,
];
function cat(job) {
  const text = [job.title || "", job.description || "", (job.skills || []).join(" ")].join(" ").toLowerCase();
  let best = null;
  for (const [c, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const n = kws.filter((k) => text.includes(k.toLowerCase())).length;
    if (n > 0 && (!best || n > best.n)) best = { c, n };
  }
  return best ? best.c : "Other";
}
function relevant(job) {
  const c = cat(job);
  if (!c || c === "Other") return false;
  if (EXCLUDE.has(c.toLowerCase())) return false;
  const text = [job.title || "", job.description || "", (job.skills || []).join(" ")].join(" ").toLowerCase();
  return !NEG.some((re) => re.test(text));
}

const SAMPLES = {
  upwork: ["Virtual Assistant for Inbox Management", "B2B Appointment Setter", "Research Assistant: LOCAL BUSINESS LIST BUILDING", "Video Editor for Matcha Platform", "ClickHouse SENIOR Experts", "Pair Recording for Native German Speakers", "Croatian-speaking B2B sales closer", "Managing references with Zotero", "Microsoft Visio Stencil Development", "Graphic designer shoe products"],
  onlinejobs: ["Virtual Appointment Setter", "GHL/Video Editor/Admin VA", "Virtual Assistant for Mental Health Practice", "Healthcare Virtual Administrative Assistant", "Admin Work", "Remote Accountant", "Amazon Senior PPC Auditor", "Video Editor Long Form"],
  guru: ["Licensed CPA Needed for Attestation", "Cross-Site UX / Product Flow Master", "HealthCentreApp Full-Stack Development", "Medical & Healthcare SME", "Entry Level GHL Developer", "WordPress Web Developer"],
  freelancer: ["Excel Data Entry & Line Charts", "Instagram Reels & Music Editing", "Beta Test SaaS US applicants only", "Monte Carlo Sizing & BIBD Randomization", "Social Media Spezialist gesucht"],
};
for (const [plat, titles] of Object.entries(SAMPLES)) {
  const kept = titles.map((t) => ({ title: t })).filter(relevant);
  console.log(`\n${plat}: ${kept.length}/${titles.length} relevant`);
  titles.forEach((t) => {
    const r = relevant({ title: t });
    console.log(`   ${r ? "KEEP " : "DROP "} ${t}`);
  });
}