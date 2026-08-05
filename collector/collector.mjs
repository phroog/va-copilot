/**
 * Sari Live Feed — Web Job Collector
 *
 * Scrapes job listing pages (Upwork, OnlineJobs.ph, LinkedIn, Indeed, ...)
 * with a real browser (Playwright) and uploads the found jobs to the shared
 * live feed. Only the admin runs this — end users never scrape.
 *
 * Runs on the admin's laptop for now; later it can run unchanged on a server
 * (headless) for 24/7 collection.
 *
 * Env:
 *   SARI_API             default https://va-copilot-theta.vercel.app
 *   ADMIN_SECRET         required — matches the server's ADMIN_SECRET
 *   POLL_INTERVAL_MIN    default 6
 *   HEADLESS             set "1" to hide the browser window (server mode)
 *   PROFILE_DIR          optional persistent browser profile (login state)
 *
 * Usage:
 *   npm start        (loop forever, every 6 min)
 *   npm run once     (single pass)
 */

import { chromium } from "playwright";

const SARI_API = process.env.SARI_API || "https://va-copilot-theta.vercel.app";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const POLL_INTERVAL_MIN = parseInt(process.env.POLL_INTERVAL_MIN || "6", 10);
const HEADLESS = process.env.HEADLESS === "1";
const PROFILE_DIR = process.env.PROFILE_DIR || null;
const ONCE = process.argv.includes("--once");

if (!ADMIN_SECRET) {
  console.error("[collector] ADMIN_SECRET is not set. Run with: set ADMIN_SECRET=... then npm start");
  process.exit(1);
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

        const postedEl = card.querySelector('[data-test="posted-date"], time, [class*="posted"]');
        const postedDate = postedEl?.textContent?.trim() || "";

        jobs.push({ title, description, budgetAmount, budgetType, url: jobUrl, platform, skills, postedDate, clientName: "" });
      });
    }

    /* OnlineJobs.ph */
    else if (platform === "OnlineJobs.ph") {
      const items = document.querySelectorAll(
        '.joblist-item, .job-post-item, #joblist > li, div[class*="job-listing"], tr[class*="job"]'
      );
      items.forEach((item) => {
        const titleEl = item.querySelector(
          '.joblist-item-title a, .job-title a, h4 a, h3 a, a[class*="title"], a[href*="/jobseekers/job/"]'
        );
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;

        const descEl = item.querySelector(
          '.joblist-item-description, .job-description, p[class*="desc"]'
        );
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

        const salaryEl = item.querySelector(
          '.joblist-item-salary, .salary, [class*="salary"], [class*="budget"]'
        );
        const budgetAmount = salaryEl?.textContent?.trim() || "";

        const linkHref = titleEl?.getAttribute("href") || "";
        const jobUrl = linkHref.startsWith("http")
          ? linkHref
          : "https://www.onlinejobs.ph" + (linkHref.startsWith("/") ? "" : "/") + linkHref;

        const companyEl = item.querySelector(
          '.joblist-item-company, .company, [class*="company"]'
        );
        const clientName = companyEl?.textContent?.trim() || "";

        const postedEl = item.querySelector(
          '.joblist-item-date, .date, time, [class*="posted"]'
        );
        const postedDate = postedEl?.textContent?.trim() || "";

        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName });
      });
    }

    /* Facebook */
    else if (platform === "Facebook") {
      const postSelectors = [
        'div[data-pagelet] div[role="article"]',
        'div[role="article"]',
        '.userContentWrapper',
        'div[class*="post"]',
      ];
      let posts = [];
      for (const sel of postSelectors) {
        posts = document.querySelectorAll(sel);
        if (posts.length > 0) break;
      }

      const keywords = /\\b(looking for|hiring|need a|job|vacancy|open position|freelancer|virtual assistant|va)\\b/i;
      posts.forEach((post) => {
        const text = post.textContent || "";
        if (!keywords.test(text)) return;

        const title = text.split("\\n").find((l) => keywords.test(l))?.trim()?.substring(0, 200) || text.substring(0, 120).trim();
        const description = text.substring(0, 2000).trim();

        const linkEl = post.querySelector('a[href*="/posts/"], a[href*="story"], a[href*="permalink"]');
        const jobUrl = linkEl?.href || url;

        const budgetMatch = text.match(/\\$\\s*[\\d,]+(?:\\s*-\\s*\\$?\\s*[\\d,]+)?(?:\\s*\\/\\s*hr)?/i);
        const budgetAmount = budgetMatch ? budgetMatch[0] : "";

        jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName: "" });
      });
    }

    /* LinkedIn */
    else if (platform === "LinkedIn") {
      const cards = document.querySelectorAll(
        '.job-card-container, .job-search-card, .job-card, article[class*="job"], li[class*="job"]'
      );
      cards.forEach((card) => {
        const titleEl = card.querySelector(
          '.job-card-list__title, .job-card-container__link, artdeco-entity-lockup__title a, a[class*="job-title"], h3 a, a[class*="job-card"]'
        );
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;

        const companyEl = card.querySelector(
          '.job-card-container__company-name, .job-search-card__subtitle, [class*="company"]'
        );
        const clientName = companyEl?.textContent?.trim() || "";

        const locationEl = card.querySelector(
          '.job-card-container__metadata-item, .job-search-card__location, [class*="location"]'
        );
        const location = locationEl?.textContent?.trim() || "";

        const linkHref = titleEl?.getAttribute("href") || "";
        const jobUrl = linkHref.startsWith("http")
          ? linkHref
          : "https://www.linkedin.com" + (linkHref.startsWith("/") ? "" : "/") + linkHref;

        const descEl = card.querySelector(
          '.job-card-container__description, .job-search-card__snippet, [class*="description"], [class*="snippet"]'
        );
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

        const budgetEl = card.querySelector('[class*="salary"], [class*="pay"], [class*="compensation"]');
        const budgetAmount = budgetEl?.textContent?.trim() || "";

        const postedEl = card.querySelector('time, [class*="posted"], [class*="date"]');
        const postedDate = postedEl?.textContent?.trim() || "";

        jobs.push({ title, description: description || location, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName });
      });
    }

    /* Indeed */
    else if (platform === "Indeed") {
      const cards = document.querySelectorAll(
        '.job_seen_beacon, .jobsearch-ResultsList .jobsearch-ResultJob, .tapItem, .result, li[class*="result"]'
      );
      cards.forEach((card) => {
        const titleEl = card.querySelector(
          '.jcs-JobTitle, h2 a, a[class*="jobTitle"], .jobTitle, span[title], a[href*="/rc/clk"]'
        );
        const title = titleEl?.textContent?.trim() || "";
        if (!title) return;

        const companyEl = card.querySelector(
          '.companyName, .company_location, [data-testid="company-name"], [class*="company"]'
        );
        const clientName = companyEl?.textContent?.trim() || "";

        const locationEl = card.querySelector(
          '.companyLocation, .location, [class*="location"]'
        );
        const location = locationEl?.textContent?.trim() || "";

        const linkHref = titleEl?.getAttribute("href") || "";
        const jobUrl = linkHref.startsWith("http")
          ? linkHref
          : "https://www.indeed.com" + (linkHref.startsWith("/") ? "" : "/") + linkHref;

        const descEl = card.querySelector(
          '.job-snippet, .summary, [class*="snippet"], [class*="description"]'
        );
        const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

        const salaryEl = card.querySelector(
          '.salary-snippet-container, .salary-snippet, [class*="salary"], [class*="metadata"]'
        );
        const budgetAmount = salaryEl?.textContent?.trim() || "";

        jobs.push({ title, description: description || location, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName });
      });
    }

    return { platform, count: jobs.length, jobs };
  }
`;

/* ── API helpers ────────────────────────────────────────────────── */
async function getPendingSources() {
  const res = await fetch(`${SARI_API}/api/jobs/pending-web-sources`, {
    headers: { "x-admin-secret": ADMIN_SECRET },
  });
  if (res.status === 401) throw new Error("Unauthorized — ADMIN_SECRET does not match the server");
  if (!res.ok) throw new Error(`pending-web-sources HTTP ${res.status}`);
  const data = await res.json();
  return data.sources || [];
}

async function uploadJobs(source, jobs) {
  const res = await fetch(`${SARI_API}/api/jobs/upload-web`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET },
    body: JSON.stringify({ sourceId: source.id, jobs }),
  });
  if (!res.ok) throw new Error(`upload-web HTTP ${res.status}`);
  return res.json();
}

/* ── Scrape one source ──────────────────────────────────────────── */
async function scrapeSource(browser, source) {
  const contextOpts = PROFILE_DIR ? { storageState: PROFILE_DIR } : {};
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  try {
    await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Wait for candidate content, then let lazy-loading run.
    const selectors = [
      'section[data-test="JobCard"]',
      ".joblist-item",
      ".job-card-container",
      ".job_seen_beacon",
      "div[role=\"article\"]",
      "article",
    ];
    await page.waitForFunction(
      (sels) => sels.some((s) => document.querySelector(s)),
      selectors,
      { timeout: 25000 }
    ).catch(() => {});
    await page.waitForTimeout(2500);

    const result = await page.evaluate(new Function(`(${SCAN_FN}); return scanPageForJobs();`));
    const jobs = (result?.jobs || []).map((j) => ({
      ...j,
      platform: j.platform || source.platform || source.name,
    }));
    return jobs;
  } finally {
    await context.close();
  }
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
    console.log(`[collector]   -> ${source.name}: ${source.url}`);
    try {
      const jobs = await scrapeSource(browser, source);
      console.log(`[collector]      found ${jobs.length} job(s)`);
      const res = await uploadJobs(source, jobs);
      totalUploaded += res.inserted || 0;
      console.log(`[collector]      uploaded ${res.inserted || 0} new`);
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
