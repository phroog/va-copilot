import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = await context.newPage();

const rand = (a, b) => a + Math.random() * (b - a);
const pause = (min, max) => new Promise((r) => setTimeout(r, rand(min, max)));

await page.goto("https://www.indeed.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(3000);

async function typeInto(sel, text) {
  const box = page.locator(sel).first();
  await box.waitFor({ state: "visible", timeout: 15000 });
  await box.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await pause(200, 400);
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: 0 });
    await page.waitForTimeout(24 + Math.random() * 30);
  }
  await pause(300, 500);
}

await typeInto('#text-input-what', "data entry");
await typeInto('#text-input-where', "Remote");
await page.keyboard.press("Enter");

await page.waitForFunction(() => /indeed\.com\/jobs\?/.test(location.href), { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log("URL:", page.url());
const jobs = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".job_seen_beacon, .jobsearch-ResultJob"))
    .map((c) => { const a = c.querySelector("a.jcs-JobTitle, h3 a"); return a ? { t: a.textContent.trim(), u: a.href } : null; })
    .filter(Boolean)
    .slice(0, 3)
);
console.log("JOBS:", JSON.stringify(jobs, null, 0));
await browser.close();