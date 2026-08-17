import { chromium } from "playwright";
import {
  elementScreenPoint,
  osClickLocator,
  osType,
  osKey,
  osRun,
} from "./os-driver.mjs";

const CDP = "http://127.0.0.1:9222";
const rand = (a, b) => a + Math.random() * (b - a);
const pause = (min, max) => new Promise((r) => setTimeout(r, rand(min, max)));

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

const platform = process.argv[2] || "onlinejobs";
const keyword = process.argv[3] || "data entry";
const demo = process.argv[4] || "search";

let page = (context.pages() || []).find((p) => {
  const u = p.url() || "";
  if (platform === "onlinejobs") return u.includes("onlinejobs.ph");
  if (platform === "upwork") return u.includes("upwork.com");
  return u.includes(platform);
});
if (!page) {
  page = await context.newPage();
}
if (platform === "onlinejobs") {
  const u = page.url() || "";
  if (!u.includes("onlinejobs.ph")) {
    await page.goto("https://www.onlinejobs.ph/jobseekers/jobsearch", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
  }
} else if (platform === "upwork") {
  const u = page.url() || "";
  if (!u.includes("upwork.com/search")) {
    await page.goto("https://www.upwork.com/search/jobs/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
}
console.log("PAGE:", page.url());
await pause(800, 1500);

let boxSel = 'input#jobkeyword, input[name="jobkeyword"]';
if (platform === "upwork") boxSel = 'input[placeholder*="Search jobs"], input[data-testid*="search"], input[name*="q"], textarea[data-testid*="search"]';
const box = page.locator(boxSel).first();
await box.waitFor({ state: "visible", timeout: 20000 });
console.log("BOX FOUND");

const pt = await elementScreenPoint(page, box);
console.log("METRICS:", JSON.stringify(pt, null, 2));

if (demo === "search") {
  console.log("\n--- OS glide + click on box ---");
  await osClickLocator(page, box);
  await pause(400, 800);
  const focusInfo = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el ? el.tagName : null,
      id: el ? el.id : null,
      ph: el ? el.getAttribute("placeholder") : null,
    };
  });
  console.log("ACTIVE ELEMENT:", JSON.stringify(focusInfo));

  console.log("\n--- OS typing with human cadence ---");
  await osType(keyword);
  await pause(200, 500);
  await osKey("Enter");

  await pause(2500, 4000);
  console.log("URL AFTER SEARCH:", page.url());
  const activeTag = await page.evaluate(() => (document.activeElement ? document.activeElement.tagName : null));
  console.log("ACTIVE AFTER ENTER:", activeTag);

  if (platform === "onlinejobs") {
    const jobs = await page
      .evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/jobseekers/job/"]').forEach((a) => {
          const h = a.querySelector("h4");
          if (h) out.push(h.textContent.trim());
        });
        return out.slice(0, 5);
      })
      .catch(() => []);
    console.log("JOBS:", JSON.stringify(jobs, null, 2));
  }
}

if (demo === "inspect") {
  console.log("\n--- inspect: hover over box, don't click ---");
  await osRun(["-Glide", "-X", String(pt.x), "-Y", String(pt.y)], "glide to box");
  console.log("Cursor should now hover the box. Check visually.");
}

await browser.close();
console.log("\nDONE");
