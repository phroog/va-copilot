import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = await context.newPage();

const rand = (a, b) => a + Math.random() * (b - a);
const pause = (min, max) => new Promise((r) => setTimeout(r, rand(min, max)));

await page.goto("https://at.indeed.com/jobs?q=data%20entry", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(3000);
console.log("LANDING URL:", page.url());

const box = page.locator('#text-input-what').first();
const visible = await box.evaluate((el) => el.getBoundingClientRect().width > 30).catch(() => false);
console.log("BOX VISIBLE:", visible);
if (!visible) {
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input"))
      .map((i) => ({ type: i.type, id: i.id, name: i.name, ph: i.placeholder, w: Math.round(i.getBoundingClientRect().width) }))
      .filter((i) => i.w > 30)
      .slice(0, 8)
  );
  console.log("INPUTS:", JSON.stringify(inputs));
  await browser.close();
  process.exit(0);
}

await box.click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Backspace");
await pause(200, 400);
for (const ch of "bookkeeping") {
  await page.keyboard.type(ch, { delay: 0 });
  await page.waitForTimeout(24 + Math.random() * 30);
}
await pause(300, 500);
await page.keyboard.press("Enter");

await page.waitForTimeout(5000);
console.log("URL AFTER:", page.url());
const jobs = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".job_seen_beacon, .jobsearch-ResultJob"))
    .map((c) => { const a = c.querySelector("a.jcs-JobTitle, h3 a"); return a ? { t: a.textContent.trim(), u: a.href } : null; })
    .filter(Boolean)
    .slice(0, 3)
);
console.log("JOBS:", JSON.stringify(jobs, null, 0));
await browser.close();