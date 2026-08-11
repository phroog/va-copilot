/**
 * Sari Live Feed — Web Job Collector
 *
 * Scrapes job listing pages (Upwork, OnlineJobs.ph, Indeed, ...) with a real
 * browser (Playwright) and uploads the found jobs to the shared live feed.
 * Only the admin runs this — end users never scrape.
 *
 * For known platforms each source is expanded into multiple search URLs (one
 * per keyword, newest-first) so the feed covers all work-from-home roles, not
 * just one search term. Run on the laptop now; later unchanged on a server
 * (HEADLESS=1) for 24/7 collection.
 *
 * Env:
 *   SARI_API               default https://va-copilot-theta.vercel.app
 *   ADMIN_SECRET           required — matches the server's ADMIN_SECRET
 *   SEARCH_KEYWORDS        comma-separated list (default covers WFH roles)
 *   CONCURRENCY            how many pages to scan in parallel, default 3
 *   POLL_INTERVAL_MIN      default 6
 *   HEADLESS               set "1" to hide the browser window (server mode)
 *   PROFILE_DIR            optional persistent browser profile (login state)
 *   TYPED_SEARCH           set "1" to search each platform by typing into ONE
 *                          warm tab (human sim) instead of navigating 16 URLs
 *
 * Usage:
 *   npm start        (loop forever, every POLL_INTERVAL_MIN minutes)
 *   npm run once     (single pass)
 */

import { chromium } from "playwright";

const SARI_API = process.env.SARI_API || "https://va-copilot-theta.vercel.app";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const POLL_INTERVAL_MIN = parseInt(process.env.POLL_INTERVAL_MIN || "6", 10);
const HEADLESS = process.env.HEADLESS === "1";
const PROFILE_DIR = process.env.PROFILE_DIR || null;
const CHROME_CDP = process.env.CHROME_CDP || null;
const ONCE = process.argv.includes("--once");
const UPWORK_TYPED = process.env.UPWORK_TYPED === "1";
const TYPED_SEARCH = process.env.TYPED_SEARCH === "1" || UPWORK_TYPED; // typed mode for all configured platforms
const JOBSPRESSO_RSS_URL =
  process.env.JOBSPRESSO_RSS_URL ||
  "https://jobspresso.co/?feed=job_feed&job_types=ai-data%2Cdesigner%2Cdeveloper%2Cmarketing%2Cvarious%2Cproduct-mgmt%2Csales%2Csupport%2Cwriting";

const SEARCH_KEYWORDS = (process.env.SEARCH_KEYWORDS || [
  "virtual assistant",
  "executive assistant",
  "social media manager",
  "data entry",
  "bookkeeping",
  "customer service",
  "content writer",
  "video editor",
  "graphic designer",
  "web developer",
  "proofreader",
  "seo specialist",
  "appointment setter",
  "lead generation",
  "transcription",
  "ecommerce assistant",
])
  .toString()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// How many pages to scan at the same time (Playwright handles them in tabs).
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || "3", 10));

if (!ADMIN_SECRET) {
  console.error("[collector] ADMIN_SECRET is not set. Run with: set ADMIN_SECRET=... then npm start");
  process.exit(1);
}

/* ── Typed-search config per platform ─────────────────────────────
 * TYPED_SEARCH=1: for each source we open ONE landing tab (the page with the
 * search box), type each keyword character-by-character (human jitter), press
 * Enter and scrape the results — searches stay in that single warm tab per
 * platform instead of 16 navigation churns. Upwork's tab is kept open across
 * passes; the other platforms reuse an already-open tab if present.
 */
const TYPED_CONFIG = {
  upwork: {
    key: "upwork",
    landingUrl: "https://www.upwork.com/nx/search/jobs/",
    boxSelectors: [
      'input[data-test="search-input"]',
      'input[placeholder*="job"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      'input[type="search"]',
      'input[name="q"]',
      "#srp-search-input",
    ],
    resultSelectors: ['section[data-test="JobCard"]', 'section[class*="job-tile"]', 'div[class*="job-card"]', 'article[class*="job"]'],
    keepTabOpen: true,
    hasCloudflare: true,
  },
  onlinejobs: {
    key: "onlinejobs",
    landingUrl: "https://www.onlinejobs.ph/jobseekers/jobsearch",
    boxSelectors: ['input#jobkeyword', 'input[name="jobkeyword"]'],
    resultSelectors: ['a[href*="/jobseekers/job/"]'],
    keepTabOpen: true,
    hasCloudflare: false,
  },
  freelance: {
    key: "freelancer",
    landingUrl: "https://www.freelancer.com/jobs",
    boxSelectors: ['input#keyword-input', 'input[name="search_keyword"]'],
    resultSelectors: [".JobSearchCard-item"],
    keepTabOpen: true,
    hasCloudflare: false,
  },
  guru: {
    key: "guru",
    landingUrl: "https://www.guru.com/d/jobs/",
    boxSelectors: ['input[aria-label="Search freelance jobs"]', 'input[placeholder*="Search freelance jobs"]'],
    resultSelectors: [".jobRecord"],
    keepTabOpen: true,
    hasCloudflare: false,
  },
  workingnomads: {
    key: "workingnomads",
    landingUrl: "https://www.workingnomads.com/jobs",
    boxSelectors: ['input[name="q"]'],
    resultSelectors: ["a.job-desktop"],
    keepTabOpen: true,
    hasCloudflare: false,
  },
};

function typedConfigFor(platformName) {
  const name = (platformName || "").toLowerCase();
  const found = Object.values(TYPED_CONFIG).find(
    (c) => name.includes(c.key) || c.key.includes(name)
  );
  return found || null;
}

/* ── Platform URL builders (newest first) ───────────────────────── */
function buildSearchUrls(source) {
  const platform = (source.platform || source.name || "").toLowerCase();
  const kw = (k) => encodeURIComponent(k);

  if (platform.includes("upwork")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.upwork.com/nx/search/jobs/?q=${kw(k)}&sort=recency`
    );
  }
  if (platform.includes("onlinejobs")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=${kw(k)}`
    );
  }
  // Login-walled platforms can't be scraped — skip defensively (e.g. old DB rows).
  if (platform.includes("linkedin") || platform.includes("facebook")) {
    return [];
  }
  if (platform.includes("indeed")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.indeed.com/jobs?q=${kw(k)}&sort=date`
    );
  }
  if (platform.includes("freelancer")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.freelancer.com/jobs/${kw(k).replace(/%20/g, "-")}`
    );
  }
  if (platform.includes("guru")) {
    // /d/jobs/?keywords= is ignored (shows all); use the skill route instead.
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.guru.com/d/jobs/skill/${kw(k).replace(/%20/g, "-")}/`
    );
  }
  if (platform.includes("remote.co") || platform.includes("remote co")) {
    // ?search= is ignored (shows category feed); use the real search route.
    return SEARCH_KEYWORDS.map(
      (k) => `https://remote.co/remote-jobs/search?searchkeyword=${kw(k)}`
    );
  }
  if (platform.includes("workingnomads")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.workingnomads.com/jobs?keyword=${kw(k)}`
    );
  }
  if (platform.includes("jobspresso")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://jobspresso.co/?s=${kw(k)}`
    );
  }
  if (platform.includes("remoteok")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://remoteok.com/remote-${kw(k).replace(/%20/g, "-")}-jobs`
    );
  }
  if (platform.includes("peopleperhour")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.peopleperhour.com/freelance-${kw(k).replace(/%20/g, "-")}-jobs`
    );
  }
  // Unknown platform: scan the configured URL as-is.
  return [source.url].filter(Boolean);
}

/* ── Scraping logic (portable string, runs inside the page) ─────── */
const SCAN_FN = `
  function scanPageForJobs() {
    const hostname = window.location.hostname;
    const url = window.location.href;
    let platform = "";
    if (hostname.includes("upwork.com")) platform = "Upwork";
    else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
    else if (hostname.includes("facebook.com")) platform = "Facebook";
    else if (hostname.includes("linkedin.com")) platform = "LinkedIn";
    else if (hostname.includes("indeed.com")) platform = "Indeed";
    else if (hostname.includes("freelancer.com")) platform = "Freelancer";
    else if (hostname.includes("guru.com")) platform = "Guru";
    else if (hostname.includes("remote.co")) platform = "Remote.co";
    else if (hostname.includes("workingnomads.com")) platform = "WorkingNomads";
    else if (hostname.includes("jobspresso.co")) platform = "Jobspresso";
    else if (hostname.includes("remoteok.com")) platform = "RemoteOK";
    else if (hostname.includes("peopleperhour.com")) platform = "PeoplePerHour";
    else platform = hostname;

    function detectExperience(el) {
      const t = (el?.textContent || "");
      const m = t.match(/Entry Level|Intermediate|Expert|Senior|Junior|Mid[ -]?Level/i);
      return m ? m[0] : "";
    }

    const jobs = [];

    /* Upwork */
    if (platform === "Upwork") {
      const cards = document.querySelectorAll(
        'section[data-test="JobCard"], section[class*="job-tile"], div[class*="job-card"], article[class*="job"]'
      );
      cards.forEach((card) => {
        const titleEl = card.querySelector(
          '[data-test="job-title"], .job-title-link, h2 a, h3 a, a[class*="job-title"]'
        );
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;

        const descEl = card.querySelector(
          '[data-test="job-description"], .job-description, .break-word, p[class*="description"]'
        );
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

        const budgetEl = card.querySelector(
          '[data-test="budget"], [data-test="JobBudget"], .job-budget, [class*="budget"]'
        );
        const budgetText = budgetEl?.textContent?.trim() || "";
        let budgetAmount = "";
        let budgetType = "";
        if (budgetText) {
          const m = budgetText.match(/\\$[\\d,]+(?:\\.\\d{2})?(?:\\s*-\\s*\\$?[\\d,]+(?:\\.\\d{2})?)?/);
          if (m) budgetAmount = m[0];
          if (/hourly|\\/hr/i.test(budgetText)) budgetType = "hourly";
          else if (/fixed/i.test(budgetText)) budgetType = "fixed";
        }

        const linkEl = titleEl?.closest("a") || card.querySelector("a[href*='/job/']");
        const jobUrl = linkEl?.href
          ? (linkEl.href.startsWith("http") ? linkEl.href : "https://www.upwork.com" + linkEl.getAttribute("href"))
          : url;

        const skills = [];
        const skillEls = card.querySelectorAll('[data-test="skill-tag"], .skill-tag, [class*="skill"]');
        skillEls.forEach((el) => {
          const t = el.textContent?.trim();
          if (t) skills.push(t);
        });

        const postedEl = card.querySelector('[data-test="job-pubilshed-date"], time, [class*="posted"]');
        const postedDate = postedEl?.textContent?.trim() || "";

        jobs.push({
          title, description, budgetAmount, budgetType, url: jobUrl, platform,
          skills, postedDate, clientName: "", experienceLevel: detectExperience(card),
        });
      });
    }

    /* OnlineJobs.ph */
    else if (platform === "OnlineJobs.ph") {
      // Each listing is an <a href="/jobseekers/job/..."> wrapping a card.
      const items = document.querySelectorAll('a[href*="/jobseekers/job/"]');
      items.forEach((item) => {
        const h4 = item.querySelector("h4");
        if (!h4) return;

        // Title = h4 text without the trailing badge (Part Time / Full Time / ...).
        const badge = h4.querySelector(".badge");
        const title = h4.textContent.replace(badge?.textContent || "", "").trim();

        const descEl = item.querySelector(".desc");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

        // Budget/salary sits in <dd class="col"> of a <dl> (e.g. "$3" or "$4-$5/hour").
        const dd = item.querySelector("dl.row dd.col");
        const budgetAmount = dd?.textContent?.trim() || "";

        const jobUrl = item.href;

        // Posted date is an <em> inside <p data-temp="YYYY-MM-DD HH:MM:SS">.
        const em = item.querySelector("p[data-temp] em");
        const postedDate = em?.textContent?.trim() || "";

        // Employment type doubles as the experience hint.
        const experienceLevel = badge?.textContent?.trim() || "";

        const skills = [];
        item.querySelectorAll(".job-tag a.badge").forEach((el) => {
          const t = el.textContent?.trim();
          if (t) skills.push(t);
        });

        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills, postedDate, clientName: "", experienceLevel });
      });
    }

    /* Indeed */
    else if (platform === "Indeed") {
      const cards = document.querySelectorAll(
        '.job_seen_beacon, .jobsearch-ResultsList .jobsearch-ResultJob, li[class*="result"]'
      );
      cards.forEach((card) => {
        // Title anchor carries class "jcs-JobTitle" and href "/rc/clk?jk=...".
        const titleEl = card.querySelector(
          'a.jcs-JobTitle, h3.jobTitle a, a[href*="/rc/clk"], span[title]'
        );
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;

        const companyEl = card.querySelector(
          '[data-testid="company-name"], .companyName, .company_location'
        );
        const clientName = companyEl?.textContent?.trim() || "";

        const locationEl = card.querySelector(
          '[data-testid="text-location"], .companyLocation, .location'
        );
        const location = locationEl?.textContent?.trim() || "";

        const linkHref = titleEl?.closest("a")?.getAttribute("href") || "";
        const jobUrl = linkHref.startsWith("http")
          ? linkHref
          : "https://www.indeed.com" + (linkHref.startsWith("/") ? "" : "/") + linkHref;

        const descEl = card.querySelector(
          '[data-testid="belowJobSnippet"], .job-snippet, .summary'
        );
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

        const salaryEl = card.querySelector(
          '.salary-snippet-container, .salary-snippet, [class*="salary"]'
        );
        const budgetAmount = salaryEl?.textContent?.trim() || "";

        const postedEl = card.querySelector('time, .date, [class*="date"]');
        const postedDate = postedEl?.textContent?.trim() || "";

        jobs.push({
          title, description: description || location, budgetAmount, budgetType: "",
          url: jobUrl, platform, skills: [], postedDate, clientName,
          experienceLevel: detectExperience(card),
        });
      });
    }

    /* Freelancer.com */
    else if (platform === "Freelancer") {
      document.querySelectorAll(".JobSearchCard-item").forEach((card) => {
        const titleEl = card.querySelector(".JobSearchCard-primary-heading-link");
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;
        const jobUrl = titleEl.href;
        const descEl = card.querySelector(".JobSearchCard-primary-description");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        const postedEl = card.querySelector(".JobSearchCard-primary-heading-days");
        const postedDate = postedEl?.textContent?.trim() || "";
        const budgetEl = card.querySelector("[class*='budget'], [class*='BidInfo'], [class*='amount']");
        const budgetAmount = budgetEl?.textContent?.trim() || "";
        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName: "", experienceLevel: "" });
      });
    }

    /* Guru.com */
    else if (platform === "Guru") {
      document.querySelectorAll(".jobRecord, [class*='jobRecord']").forEach((card) => {
        const titleEl = card.querySelector(".jobRecord__title a, h2 a");
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;
        const jobUrl = titleEl.href;
        const metaEl = card.querySelector(".jobRecord__meta");
        const postedDate = metaEl?.textContent?.trim()?.replace(/^Posted\s*/i, "") || "";
        const budgetEl = card.querySelector(".jobRecord__budget");
        const budgetAmount = budgetEl?.textContent?.trim()?.replace(/\|/g, "-") || "";
        const descEl = card.querySelector(".jobRecord__description, .record__description, p.copy");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName: "", experienceLevel: detectExperience(card) });
      });
    }

    /* Remote.co */
    else if (platform === "Remote.co") {
      document.querySelectorAll('a[href*="job-details"]').forEach((titleEl) => {
        let title = titleEl?.textContent?.trim()?.replace(/\s+/g, " ") || "";
        if (!title || title.length < 10) return;
        // Strip leading date badges ("New!", "Today", "3 days ago", "2 weeks ago"...)
        const dateMatch = title.match(/^(New!\s*)?(today|yesterday|\d+\s*(hour|day|week)s?\s*ago)/i);
        const postedDate = dateMatch ? dateMatch[0].trim() : "";
        title = title.replace(dateMatch ? dateMatch[0] : "", "").trim();
        if (!title) return;
        const jobUrl = titleEl.href;
        const card = titleEl.closest("li, .job-listing, article, div") || titleEl.parentElement;
        const descEl = card?.querySelector("p, .description, [class*='snippet']");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        jobs.push({ title, description, budgetAmount: "", budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName: "", experienceLevel: "" });
      });
    }

    /* WorkingNomads */
    else if (platform === "WorkingNomads") {
      document.querySelectorAll("a.job-desktop").forEach((titleEl) => {
        const title = titleEl?.querySelector("h4")?.textContent?.trim() || titleEl?.textContent?.trim() || "";
        if (!title) return;
        const jobUrl = titleEl.href;
        const descEl = titleEl.querySelector(".job-desktop__company, .job-desktop__description, .job-detail");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        const postedEl = titleEl.querySelector("time, .job-desktop__date, [class*='date']");
        const postedDate = postedEl?.textContent?.trim() || "";
        const locEl = titleEl.querySelector(".job-desktop__location");
        const clientName = locEl?.textContent?.trim() || "";
        jobs.push({ title, description, budgetAmount: "", budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName, experienceLevel: "" });
      });
    }

    /* Jobspresso */
    else if (platform === "Jobspresso") {
      document.querySelectorAll(".entry-title a").forEach((titleEl) => {
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;
        const jobUrl = titleEl.href;
        const card = titleEl.closest(".job_listing, article, li") || titleEl.parentElement;
        const descEl = card?.querySelector(".entry-content, .job-description, p");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        const budgetEl = card?.querySelector(".job-tags, .company, [class*='salary']");
        const budgetAmount = budgetEl?.textContent?.trim() || "";
        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName: "", experienceLevel: "" });
      });
    }

    /* RemoteOK */
    else if (platform === "RemoteOK") {
      document.querySelectorAll("tr.job, tr[data-posting-id]").forEach((card) => {
        const titleEl = card.querySelector(".company_and_position a, a[class*='preventLink'], td[class*='position'] a, h2 a");
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;
        const linkHref = card.getAttribute("data-url") || titleEl?.getAttribute("href") || "";
        const jobUrl = linkHref.startsWith("http") ? linkHref : "https://remoteok.com" + linkHref;
        const companyEl = card.querySelector(".companyLink, [class*='company']");
        const clientName = companyEl?.textContent?.trim() || card.getAttribute("data-company") || "";
        const meta = card.querySelector("td[class*='position'] .location, .location");
        const location = meta?.textContent?.trim() || "";
        jobs.push({ title, description: location, budgetAmount: "", budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName, experienceLevel: "" });
      });
    }

    /* PeoplePerHour */
    else if (platform === "PeoplePerHour") {
      document.querySelectorAll('a[href*="freelance-jobs/"], a.item__url').forEach((titleEl) => {
        const title = titleEl?.textContent?.trim() || "";
        if (!title || title.length < 10) return;
        const jobUrl = titleEl.href;
        const card = titleEl.closest("li, article, [class*='ListItem']") || titleEl.parentElement;
        const descEl = card?.querySelector("p, [class*='description'], [class*='summary']");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        const budgetEl = card?.querySelector("[class*='price'], [class*='budget'], [class*='rate']");
        const budgetAmount = budgetEl?.textContent?.trim() || "";
        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName: "", experienceLevel: "" });
      });
    }

    return { platform, count: jobs.length, jobs };
  }
`;

/* ── API helpers ────────────────────────────────────────────────── */
/** Parse listing "posted X ago" / "Posted on YYYY-MM-DD" text into an ISO date. */
function parsePostedDate(raw) {
  if (!raw) return null;
  const t = raw.toLowerCase();
  const now = Date.now();

  // Absolute date: "Posted on 2026-08-01 17:50:27" or "2026-08-01"
  const abs = t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})?:?(\d{2})?/);
  if (abs) {
    const [, y, mo, d, h, mi, s] = abs;
    const iso = `${y}-${mo}-${d}T${h || "00"}:${mi || "00"}:${s || "00"}Z`;
    const ts = Date.parse(iso);
    if (!isNaN(ts)) return new Date(ts).toISOString();
  }

  // Relative: "5 hours ago", "2 days ago", "3 minutes ago", "just now", "today"
  const num = t.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
  if (num) {
    const n = parseInt(num[1], 10);
    const unit = num[2];
    const ms = { minute: 60e3, hour: 36e5, day: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }[unit] || 0;
    return new Date(now - n * ms).toISOString();
  }
  if (/just now|moments ago|a few seconds/i.test(t)) return new Date(now).toISOString();
  if (/today/i.test(t)) return new Date(now).toISOString();
  if (/yesterday/i.test(t)) return new Date(now - 864e5).toISOString();

  return null;
}

async function getPendingSources() {
  const res = await fetch(`${SARI_API}/api/jobs/pending-web-sources`, {
    headers: { "x-admin-secret": ADMIN_SECRET },
  });
  if (res.status === 401) throw new Error("Unauthorized — ADMIN_SECRET does not match the server");
  if (!res.ok) throw new Error(`pending-web-sources HTTP ${res.status}`);
  const data = await res.json();
  return data.sources || [];
}

async function uploadJobs(source, jobs, attempt = 1) {
  try {
    const res = await fetch(`${SARI_API}/api/jobs/upload-web`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET },
      body: JSON.stringify({ sourceId: source.id, jobs }),
    });
    if (!res.ok) throw new Error(`upload-web HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return uploadJobs(source, jobs, attempt + 1);
    }
    throw err;
  }
}

/* ── Scrape one URL ─────────────────────────────────────────────── */
async function scrapeUrl(context, url, platformName) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Cloudflare "Just a moment..." challenge: with real Chrome the Turnstile
    // checkbox often passes automatically after a few seconds. Give it up to
    // 60s (polling with human jitter, not reloading — a reload resets the
    // challenge). If a checkbox iframe is present, click it like a human.
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const stuck = await page
        .evaluate(() => document.body.innerText.includes("Just a moment"))
        .catch(() => false);
      if (!stuck) break;

      try {
        const frames = page.frames();
        for (const f of frames) {
          const box = await f.$(
            'input[type="checkbox"], [role="checkbox"], .cb-i-frame, iframe[title*="checkbox"]'
          );
          if (box) {
            // Small human delay + mouse move before the click.
            await page.mouse.move(rand(300, 800), rand(300, 600), { steps: 5 }).catch(() => {});
            await box.click({ force: true, timeout: 2000 }).catch(() => {});
          }
        }
      } catch {}

      await page.waitForTimeout(rand(2200, 3800));
    }

    // Wait for candidate content, then scroll to load more results.
    const selectors = [
      'section[data-test="JobCard"]',
      'a[href*="/jobseekers/job/"]',
      ".job_seen_beacon",
      ".jobsearch-ResultJob",
      "div[role=\"article\"]",
      "article",
    ];
    await page.waitForFunction(
      (sels) => sels.some((s) => document.querySelector(s)),
      selectors,
      { timeout: 25000 }
    ).catch(() => {});

    // OnlineJobs.ph is server-rendered: all results are in the DOM already, so
    // scrolling only wastes time. Only lazy-loading platforms need scrolling.
    const needsScroll = !(platformName || "").toLowerCase().includes("onlinejobs");
    if (needsScroll) await humanScroll(page, 5);
    await humanPause(800, 1800);

    const result = await page.evaluate(new Function(`${SCAN_FN}; return scanPageForJobs();`));
    const jobs = (result?.jobs || []).map((j) => ({
      ...j,
      platform: j.platform || platformName,
      posted_at: parsePostedDate(j.postedDate) || new Date().toISOString(),
    }));
    if (jobs.length === 0) {
      const stuck = await page
        .evaluate(() => document.body.innerText.includes("Just a moment") || document.body.innerText.includes("Blocked"))
        .catch(() => false);
      if (stuck) console.warn(`[collector]      ⚠ ${url}: page blocked (Cloudflare/bot wall), 0 jobs`);
    }
    return jobs;
  } finally {
    await page.close().catch(() => {});
  }
}

/* ── "Typed search" mode (TYPED_SEARCH=1) ─────────────────────────
 * Instead of navigating straight to per-keyword search URLs (16 navigation
 * churns), we open ONE landing tab per platform (the page that has the search
 * box), keep it warm, focus the box and type each keyword character-by-
 * character (human jitter), press Enter and scrape the results. For Upwork
 * this reuses your real logged-in Chrome tab (CDP) — the warm session stays.
 */
async function scrapeTyped(context, source, platformName) {
  const cfg = typedConfigFor(platformName);
  if (!cfg) {
    console.warn(`[collector]   no typed config for ${platformName}, falling back to URL scan`);
    return null;
  }

  // Reuse an already-open tab for this platform if present (especially in
  // CHROME_CDP mode driving your real Chrome): keeps warm, logged-in sessions.
  let page = (context.pages?.() || []).find(
    (p) => (p.url() || "").includes(cfg.key === "onlinejobs" ? "onlinejobs.ph" : cfg.key)
  ) || null;
  const shouldClose = !page && !cfg.keepTabOpen;

  if (!page) {
    page = await context.newPage();
    await page.goto(cfg.landingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  } else {
    console.log(`[collector]   reusing open ${cfg.key} tab:`, page.url());
  }
  const seen = new Set();
  let totalInserted = 0;

  try {
    // Cloudflare "Just a moment..." challenge (Upwork): wait it out with human
    // jitter (no reload — a reload resets it). Click Turnstile checkbox if present.
    if (cfg.hasCloudflare) {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        const stuck = await page
          .evaluate(() => document.body.innerText.includes("Just a moment"))
          .catch(() => false);
        if (!stuck) break;
        try {
          for (const f of page.frames()) {
            const box = await f.$(
              'input[type="checkbox"], [role="checkbox"], .cb-i-frame, iframe[title*="checkbox"]'
            );
            if (box) {
              await page.mouse.move(rand(300, 800), rand(300, 600), { steps: 5 }).catch(() => {});
              await box.click({ force: true, timeout: 2000 }).catch(() => {});
            }
          }
        } catch {}
        await page.waitForTimeout(rand(2200, 3800));
      }
    }

    const waitForResults = async () => {
      await page.waitForFunction(
        (sels) => sels.some((s) => document.querySelector(s)),
        cfg.resultSelectors,
        { timeout: 25000 }
      ).catch(() => {});
      await page.waitForTimeout(rand(1200, 2400));
    };

    const boxSel = cfg.boxSelectors.join(", ");

    for (const keyword of SEARCH_KEYWORDS) {
      try {
        let box = page.locator(boxSel).first();
        const boxOk = await box.waitFor({ state: cfg.forceClick ? "attached" : "visible", timeout: 8000 }).then(() => true).catch(() => false);
        if (!boxOk) {
          console.log(`[collector]      search box missing, loading ${cfg.landingUrl}`);
          await page.goto(cfg.landingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
          box = page.locator(boxSel).first();
          await box.waitFor({ state: cfg.forceClick ? "attached" : "visible", timeout: 20000 });
        }

        // Human typing: focus, clear, then character-by-character with jitter.
        if (cfg.forceClick) {
          await box.click({ force: true }).catch(() => {});
          await box.evaluate((el) => el.focus());
        } else {
          await box.click();
        }
        await page.keyboard.press("Control+A");
        await page.keyboard.press("Backspace");
        await humanPause(200, 500);
        for (const ch of keyword) {
          await page.keyboard.type(ch, { delay: 0 });
          await page.waitForTimeout(24 + Math.random() * 40);
        }
        await humanPause(150, 400);
        await page.keyboard.press("Enter");

        await waitForResults();

        const result = await page.evaluate(new Function(`${SCAN_FN}; return scanPageForJobs();`));
        const jobs = (result?.jobs || []).map((j) => ({
          ...j,
          platform: j.platform || platformName,
          posted_at: parsePostedDate(j.postedDate) || new Date().toISOString(),
        }));
        for (const j of jobs) {
          const key = j.url || `${j.title}|${j.clientName}`;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          try {
            const res = await uploadJobs(source, [j]);
            totalInserted += res.inserted || 0;
            console.log(`[collector]      + "${j.title}" (${res.inserted ? "new" : "dup"})`);
          } catch (err) {
            console.error(`[collector]      upload failed for "${j.title}": ${err.message}`);
          }
        }
        console.log(`[collector]      typed "${keyword}": ${jobs.length} job(s) on page`);
      } catch (err) {
        console.error(`[collector]      skip typed "${keyword}": ${err.message}`);
      }
      await humanPause(2500, 6000);
    }
  } finally {
    if (shouldClose) await page.close().catch(() => {});
  }
  return totalInserted;
}

/* ── RSS-feed scraping (Jobspresso) ───────────────────────────────
 * Jobspresso serves a proper XML RSS feed (no login/bot wall, includes
 * title/link/description/company/pubDate). Parse it with plain string regex
 * extraction — no browser needed, so it's fast and immune to selector drift.
 */
function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#038;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  const extract = (block, re) => {
    const m = block.match(re);
    return m && m[1] ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
  };
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extract(block, /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const link = extract(block, /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const description = extract(block, /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const client = extract(block, /<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i);
    const pubDate = extract(block, /<pubDate>([\s\S]*?)<\/pubDate>/i);
    if (!title || !link) continue;
    items.push({
      title: decodeXmlEntities(title),
      url: link.replace(/&amp;/g, "&").trim(),
      description: decodeXmlEntities(
        description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").substring(0, 1000)
      ),
      clientName: (client ? decodeXmlEntities(client.split("<br")[0].trim()) : "").replace(/⚲.*$/, "").trim(),
      postedDate: pubDate,
    });
  }
  return items;
}

async function scrapeRss(source, platformName) {
  const url = JOBSPRESSO_RSS_URL;
  let totalInserted = 0;
  try {
    const res = await fetch(url, { headers: { "User-Agent": DESKTOP_UA } });
    if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRssItems(xml);
    console.log(`[collector]      RSS: ${items.length} job(s) in feed`);
    const seen = new Set();
    for (const it of items) {
      const key = it.url || `${it.title}|${it.clientName}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const postedIso = it.postedDate ? new Date(it.postedDate).toISOString() : "";
      try {
        const resu = await uploadJobs(source, [{
          title: it.title,
          description: it.description,
          url: it.url,
          platform: platformName,
          clientName: it.clientName,
          postedDate: postedIso,
          budgetAmount: "",
          budgetType: "",
          skills: [],
          experienceLevel: "",
        }]);
        totalInserted += resu.inserted || 0;
        console.log(`[collector]      + "${it.title}" (${resu.inserted ? "new" : "dup"})`);
      } catch (err) {
        console.error(`[collector]      RSS upload failed for "${it.title}": ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[collector]      RSS failed: ${err.message}`);
  }
  return totalInserted;
}

/* ── Browser stealth: look like a real Chrome, not a headless bot ── */
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Random delay with jitter — humans are never perfectly regular. */
function humanPause(minMs, maxMs) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * Scroll like a human: small variable steps, occasional pauses, sometimes a
 * small scroll back up (re-reading), mouse moves while scrolling.
 */
async function humanScroll(page, targetSteps = 5) {
  const steps = Math.max(2, Math.floor(targetSteps + Math.random() * 2));
  for (let i = 0; i < steps; i++) {
    const dir = Math.random() < 0.9 ? 1 : -1; // 10% chance to scroll up a bit
    const px = Math.floor(rand(150, 550) * dir);
    // Move the mouse to a random spot on the page while scrolling (like a real user).
    await page.mouse.move(rand(200, 1100), rand(150, 800), { steps: 8 }).catch(() => {});
    await page.evaluate((p) => window.scrollBy(0, p), px).catch(() => {});
    await page.waitForTimeout(rand(350, 1400)).catch(() => {});
  }
}

function buildContext(browser, source) {
  return browser.newContext({
    userAgent: DESKTOP_UA,
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    viewport: { width: 1366, height: 900 },
  });
}

/* ── Scrape one source (all expanded search URLs, in parallel) ──── */
async function scrapeSource(browser, source, persistentContext) {
  const context = persistentContext || (await buildContext(browser, source));
  const needsClose = !persistentContext;
  if (!persistentContext) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
  }
  const urls = buildSearchUrls(source);
  const seen = new Set();
  const platformName = source.platform || source.name;
  let totalInserted = 0;

  try {
    // Jobspresso: use its RSS feed — no browser, no bot wall, no selector drift.
    if ((platformName || "").toLowerCase().includes("jobspresso")) {
      console.log(`[collector]   ${platformName} RSS-feed mode`);
      return await scrapeRss(source, platformName);
    }

    if (TYPED_SEARCH) {
      const typedResult = await scrapeTyped(context, source, platformName);
      if (typedResult !== null) {
        console.log(`[collector]   typed-search mode (1 warm tab per platform)`);
        return typedResult;
      }
    }

    // Scan URLs with a cap on concurrent tabs, and STAGGERED starts: a human
    // opens one search at a time, not 16 tabs instantly. Each job is uploaded
    // immediately after it is found, so jobs stream into the live feed.
    const maxConcurrent = Math.min(CONCURRENCY, 3);
    let next = 0;
    let active = 0;
    const runNext = async () => {
      while (next < urls.length) {
        const idx = next++;
        const url = urls[idx];
        try {
          const jobs = await scrapeUrl(context, url, platformName);
          for (const j of jobs) {
            const key = j.url || `${j.title}|${j.clientName}`;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            try {
              const res = await uploadJobs(source, [j]);
              totalInserted += res.inserted || 0;
              console.log(`[collector]      + "${j.title}" (${res.inserted ? "new" : "dup"})`);
            } catch (err) {
              console.error(`[collector]      upload failed for "${j.title}": ${err.message}`);
            }
          }
          console.log(`[collector]      ${url}: ${jobs.length} job(s) on page`);
        } catch (err) {
          console.error(`[collector]      skip ${url}: ${err.message}`);
        }
        // Human pause between searches before the next tab opens.
        await humanPause(600, 1500);
      }
    };

    const workers = Array.from({ length: maxConcurrent }, async () => {
      if (++active > 1) await humanPause(800, 2000); // stagger tab openings
      await runNext();
    });
    await Promise.all(workers);
  } finally {
    if (needsClose) await context.close();
  }
  return totalInserted;
}

/* ── Main loop ──────────────────────────────────────────────────── */
async function runPass(browser, persistentContext) {
  console.log(`[collector] ${new Date().toISOString()} polling pending web sources...`);
  const sources = await getPendingSources();
  if (sources.length === 0) {
    console.log("[collector] no pending sources");
    return 0;
  }

  let totalUploaded = 0;
  for (const source of sources) {
    console.log(`[collector]   -> ${source.name} (${SEARCH_KEYWORDS.length} keywords)`);
    try {
      const inserted = await scrapeSource(browser, source, persistentContext);
      totalUploaded += inserted;
      console.log(`[collector]      uploaded ${inserted} new`);
    } catch (err) {
      console.error(`[collector]      FAILED: ${err.message}`);
      // Mark as collected anyway so a broken source isn't retried every pass.
      try { await uploadJobs(source, []); } catch {}
    }
  }
  console.log(`[collector] done, ${totalUploaded} new job(s) this pass`);
  return totalUploaded;
}

/* ── Browser launch (real Chrome preferred, bundled Chromium as fallback) ──
 * channel: "chrome" gives far fewer bot signals and a longer-lived
 * Cloudflare cf_clearance, but it requires Google Chrome installed on the
 * host. On servers/containers without it we fall back to the bundled
 * Chromium that `npx playwright install chromium` provides. */
function launchOpts() {
  return {
    headless: HEADLESS,
    channel: "chrome",
    locale: "en-US",
    viewport: { width: 1366, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  };
}

async function launchBrowser() {
  const opts = launchOpts();
  try {
    return await chromium.launch(opts);
  } catch (err) {
    const { channel, ...rest } = opts;
    console.warn(`[collector] system Chrome unavailable (${err.message?.split("\n")[0] || err.message}). Falling back to bundled Chromium.`);
    return await chromium.launch(rest);
  }
}

async function launchPersistent(profileDir) {
  const opts = launchOpts();
  try {
    return await chromium.launchPersistentContext(profileDir, opts);
  } catch (err) {
    const { channel, ...rest } = opts;
    console.warn(`[collector] system Chrome unavailable (${err.message?.split("\n")[0] || err.message}). Falling back to bundled Chromium.`);
    return await chromium.launchPersistentContext(profileDir, rest);
  }
}

async function main() {
  console.log(`[collector] browser ${HEADLESS ? "headless" : "windowed"} · API ${SARI_API} · every ${POLL_INTERVAL_MIN} min`);
  console.log(`[collector] keywords: ${SEARCH_KEYWORDS.join(", ")}`);
  console.log(`[collector] profile: ${PROFILE_DIR ? `persistent browser profile "${PROFILE_DIR}"` : "ephemeral (no login state)"}`);

  let browser;
  let persistentContext = null;
  if (CHROME_CDP) {
    // Connect to your REAL running Chrome (started with --remote-debugging-port).
    // The collector drives your own browser, so your real cookies, login state
    // and trusted fingerprint are used — Cloudflare sees a normal browser.
    browser = await chromium.connectOverCDP(CHROME_CDP);
    persistentContext = browser.contexts()[0];
    console.log(`[collector] connected to real Chrome via CDP ${CHROME_CDP}`);
  } else if (PROFILE_DIR) {
    // Persistent context: keeps cookies (incl. Cloudflare cf_clearance) and
    // login state between runs. Solve the Upwork CAPTCHA once in the visible
    // window and it is remembered for later passes.
    persistentContext = await launchPersistent(PROFILE_DIR);
    await persistentContext.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    browser = persistentContext.browser();
  } else {
    browser = await launchBrowser();
  }

  if (ONCE) {
    await runPass(browser, persistentContext);
    if (persistentContext) await persistentContext.close();
    else await browser.close();
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runPass(browser, persistentContext);
    } catch (err) {
      console.error(`[collector] pass failed: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MIN * 60 * 1000));
  }
}

main().catch((err) => {
  console.error("[collector] fatal:", err);
  process.exit(1);
});
