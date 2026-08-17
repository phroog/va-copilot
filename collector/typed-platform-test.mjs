import { chromium } from "playwright";

const CDP = "http://localhost:9222";

const rand = (a, b) => a + Math.random() * (b - a);
const pause = (min, max) => new Promise((r) => setTimeout(r, rand(min, max)));

const TYPED_CONFIG = {
  onlinejobs: {
    key: "onlinejobs",
    landingUrl: "https://www.onlinejobs.ph/jobseekers/jobsearch",
    boxSelectors: ['input#jobkeyword', 'input[name="jobkeyword"]'],
    resultSelectors: ['a[href*="/jobseekers/job/"]'],
  },
  indeed: {
    key: "indeed",
    landingUrl: "https://www.indeed.com/",
    boxSelectors: ['input#text-input-what', 'input[name="q"]'],
    resultSelectors: [".job_seen_beacon", ".jobsearch-ResultJob", ".jobsearch-ResultsList .result"],
  },
  freelancer: {
    key: "freelancer",
    landingUrl: "https://www.freelancer.com/jobs",
    boxSelectors: ['input#keyword-input', 'input[name="search_keyword"]'],
    resultSelectors: [".JobSearchCard-item"],
  },
  guru: {
    key: "guru",
    landingUrl: "https://www.guru.com/d/jobs/",
    boxSelectors: ['input[aria-label="Search freelance jobs"]', 'input[placeholder*="Search freelance jobs"]'],
    resultSelectors: [".jobRecord"],
  },
  remoteok: {
    key: "remoteok",
    landingUrl: "https://remoteok.com/",
    boxSelectors: ['input[placeholder*="🔍 Search"]'],
    resultSelectors: ["tr.job"],
  },
  workingnomads: {
    key: "workingnomads",
    landingUrl: "https://www.workingnomads.com/jobs",
    boxSelectors: ['input[name="q"]'],
    resultSelectors: ["a.job-desktop"],
  },
  jobspresso: {
    key: "jobspresso",
    landingUrl: "https://jobspresso.co/",
    boxSelectors: ['input#s', 'input[name="s"]'],
    resultSelectors: [".entry-title a", ".job_listing"],
    forceClick: true,
  },
  peopleperhour: {
    key: "peopleperhour",
    landingUrl: "https://www.peopleperhour.com/freelance-jobs",
    boxSelectors: ['input[placeholder*="Search projects"]'],
    resultSelectors: ['a[href*="freelance-jobs/"]'],
  },
};

const SCAN = (platform) => `
  function scan() {
    const jobs = [];
    const hostname = location.hostname;
    let p = "";
    if (hostname.includes("onlinejobs.ph")) p = "OnlineJobs.ph";
    else if (hostname.includes("indeed.com")) p = "Indeed";
    else if (hostname.includes("freelancer.com")) p = "Freelancer";
    else if (hostname.includes("guru.com")) p = "Guru";
    else if (hostname.includes("remoteok.com")) p = "RemoteOK";
    else if (hostname.includes("workingnomads.com")) p = "WorkingNomads";
    else if (hostname.includes("jobspresso.co")) p = "Jobspresso";
    else if (hostname.includes("peopleperhour.com")) p = "PeoplePerHour";
    else p = hostname;
    let results = [];
    if (p === "OnlineJobs.ph") {
      results = document.querySelectorAll('a[href*="/jobseekers/job/"]');
      results.forEach((a) => { const h = a.querySelector("h4"); if (h) jobs.push({ title: h.textContent.replace((a.querySelector("h4 .badge")?.textContent||""), "").trim(), url: a.href }); });
    } else if (p === "Indeed") {
      document.querySelectorAll('.job_seen_beacon, .jobsearch-ResultJob').forEach((c) => { const t = c.querySelector("a.jcs-JobTitle, h3 a"); if (t) jobs.push({ title: t.textContent.trim(), url: t.href }); });
    } else if (p === "Freelancer") {
      document.querySelectorAll(".JobSearchCard-item").forEach((c) => { const a = c.querySelector(".JobSearchCard-primary-heading-link"); if (a) jobs.push({ title: a.textContent.trim(), url: a.href }); });
    } else if (p === "Guru") {
      document.querySelectorAll(".jobRecord").forEach((c) => { const a = c.querySelector(".jobRecord__title a, h2 a"); if (a) jobs.push({ title: a.textContent.trim(), url: a.href }); });
    } else if (p === "RemoteOK") {
      document.querySelectorAll("tr.job").forEach((c) => { const a = c.querySelector("a[class*='preventLink'], td[class*='position'] a, h2 a"); if (a) jobs.push({ title: a.textContent.trim(), url: a.href }); });
    } else if (p === "WorkingNomads") {
      document.querySelectorAll("a.job-desktop").forEach((a) => { const t = a.querySelector("h4")?.textContent?.trim(); if (t) jobs.push({ title: t, url: a.href }); });
    } else if (p === "Jobspresso") {
      document.querySelectorAll(".entry-title a").forEach((a) => { if (a.textContent.trim()) jobs.push({ title: a.textContent.trim(), url: a.href }); });
    } else if (p === "PeoplePerHour") {
      document.querySelectorAll('a[href*="freelance-jobs/"], a.item__url').forEach((a) => { const t = a.textContent.trim(); if (t && t.length > 10) jobs.push({ title: t, url: a.href }); });
    }
    return jobs.slice(0, 3);
  }
`;

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

const platform = process.argv[2];
const keyword = process.argv[3] || "data entry";
const cfg = TYPED_CONFIG[platform];
if (!cfg) { console.log("platform not found:", platform); process.exit(1); }

const pagesBefore = context.pages().length;
let page = (context.pages() || []).find((p) => (p.url() || "").includes(cfg.key === "onlinejobs" ? "onlinejobs.ph" : cfg.key));
if (page) { console.log("REUSING tab:", page.url()); } else {
  page = await context.newPage();
  await page.goto(cfg.landingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
}

try {
  const boxSel = cfg.boxSelectors.join(", ");
  let box = page.locator(boxSel).first();
  const boxOk = await box.waitFor({ state: cfg.forceClick ? "attached" : "visible", timeout: 8000 }).then(() => true).catch(() => false);
  if (!boxOk) {
    console.log("box not on reused page, navigating to landing:", cfg.landingUrl);
    await page.goto(cfg.landingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    box = page.locator(boxSel).first();
    await box.waitFor({ state: cfg.forceClick ? "attached" : "visible", timeout: 20000 });
  }
  if (cfg.forceClick) {
    await box.click({ force: true }).catch(() => {});
    await box.evaluate((el) => el.focus());
  } else {
    await box.click();
  }
  await page.evaluate(() => { const el = document.activeElement; if (el && el.focus) el.focus(); });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await pause(200, 500);
  for (const ch of keyword) {
    await page.keyboard.type(ch, { delay: 0 });
    await page.waitForTimeout(24 + Math.random() * 40);
  }
  await pause(150, 400);
  await page.keyboard.press("Enter");

  await page.waitForFunction((sels) => sels.some((s) => document.querySelector(s)), cfg.resultSelectors, { timeout: 25000 }).catch(() => {});
  await pause(1500, 2800);

  console.log("URL after search:", page.url());
  const jobs = await page.evaluate(new Function(`${SCAN()}; return scan();`));
  console.log(`JOBS (${jobs.length} shown):`);
  jobs.forEach((j) => console.log(`  - ${j.title} | ${j.url}`));
} catch (err) {
  console.log(`FAILED: ${err.message.split("\n")[0]}`);
}

console.log(`TABS BEFORE ${pagesBefore} / AFTER ${context.pages().length}`);
if (page && !(context.pages() || []).includes(page)) { /* page closed */ }
await browser.close();