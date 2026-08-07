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
    return SEARCH_KEYWORDS.map(
      (k) => `https://www.guru.com/d/jobs/?keywords=${kw(k)}`
    );
  }
  if (platform.includes("remote.co") || platform.includes("remote co")) {
    return SEARCH_KEYWORDS.map(
      (k) => `https://remote.co/remote-jobs/?search=${kw(k)}`
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
        const title = titleEl?.textContent?.trim() || "";
        if (!title || title.length < 10) return;
        const jobUrl = titleEl.href;
        const card = titleEl.closest("li, .job-listing, article, div") || titleEl.parentElement;
        const descEl = card?.querySelector("p, .description, [class*='snippet']");
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
        jobs.push({ title, description, budgetAmount: "", budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName: "", experienceLevel: "" });
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

async function main() {
  const launchOpts = {
    headless: HEADLESS,
    // Real installed Chrome (not bundled Chromium): far fewer bot signals,
    // and the Cloudflare cf_clearance from it lasts much longer.
    channel: "chrome",
    locale: "en-US",
    viewport: { width: 1366, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  };
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
    persistentContext = await chromium.launchPersistentContext(PROFILE_DIR, launchOpts);
    await persistentContext.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    browser = persistentContext.browser();
  } else {
    browser = await chromium.launch(launchOpts);
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
