import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = await context.newPage();

const rand = (a, b) => a + Math.random() * (b - a);
const pause = (min, max) => new Promise((r) => setTimeout(r, rand(min, max)));

await page.goto("https://jobspresso.co/", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(3000);

const box = page.locator('input#s').first();
await box.click({ force: true }).catch(() => {});
await box.evaluate((el) => el.focus());
await page.keyboard.press("Control+A");
await page.keyboard.press("Backspace");
await pause(300, 500);
for (const ch of "booking software") {
  await page.keyboard.type(ch, { delay: 0 });
  await page.waitForTimeout(30 + Math.random() * 30);
}
await pause(500, 800);
const val = await box.evaluate((el) => el.value);
console.log("FIELD VALUE:", JSON.stringify(val));
const forms = await page.evaluate(() =>
  Array.from(document.querySelectorAll("form")).map((f) => ({ action: f.getAttribute("action"), method: f.getAttribute("method"), html: f.outerHTML.slice(0, 300) }))
);
console.log("FORMS:", JSON.stringify(forms, null, 0));
await page.keyboard.press("Enter");
await page.waitForTimeout(5000);
console.log("URL AFTER ENTER:", page.url());
await browser.close();