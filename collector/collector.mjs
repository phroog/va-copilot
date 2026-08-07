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

    // Cloudflare "Just a moment..." challenge: give it time to pass, then
    // reload if the page is still stuck on the challenge.
    for (let attempt = 0; attempt < 3; attempt++) {
      const stuck = await page
        .evaluate(() => document.body.innerText.includes("Just a moment"))
        .catch(() => false);
      if (!stuck) break;
      await page.waitForTimeout(8000);
      if (attempt < 2) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      }
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
    const scrolls = (platformName || "").toLowerCase().includes("onlinejobs") ? 0 : 5;
    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight)).catch(() => {});
      await page.waitForTimeout(1200).catch(() => {});
    }
    await page.waitForTimeout(1500).catch(() => {});

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

function buildContext(browser, source) {
  const contextOpts = PROFILE_DIR ? { storageState: PROFILE_DIR } : {};
  return browser.newContext({
    ...contextOpts,
    userAgent: DESKTOP_UA,
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    viewport: { width: 1366, height: 900 },
  });
}

/* ── Scrape one source (all expanded search URLs, in parallel) ──── */
async function scrapeSource(browser, source) {
  const context = await buildContext(browser, source);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const urls = buildSearchUrls(source);
  const seen = new Set();
  const platformName = source.platform || source.name;
  let totalInserted = 0;

  try {
    // Run up to CONCURRENCY URLs at once. Each gets its own page (tab), which
    // Playwright handles safely within a shared context. Every single job is
    // uploaded immediately after it is found, so jobs stream into the live
    // feed one by one while the scan continues.
    let next = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
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
      }
    });
    await Promise.all(workers);
  } finally {
    await context.close();
  }
  return totalInserted;
}

/* ── Main loop ──────────────────────────────────────────────────── */
async function runPass(browser) {
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
      const inserted = await scrapeSource(browser, source);
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
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  };
  const browser = await chromium.launch(launchOpts);
  console.log(`[collector] browser ${HEADLESS ? "headless" : "windowed"} · API ${SARI_API} · every ${POLL_INTERVAL_MIN} min`);
  console.log(`[collector] keywords: ${SEARCH_KEYWORDS.join(", ")}`);

  if (ONCE) {
    await runPass(browser);
    await browser.close();
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runPass(browser);
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
