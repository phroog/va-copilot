import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

async function inspectInputs(name, url, waitMs = 5000) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(waitMs);
    console.log(`\n=== ${name} (${page.url()}) ===`);
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input"))
        .map((i) => ({ type: i.type, name: i.name, id: i.id, ph: i.placeholder, w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height) }))
        .filter((i) => i.w > 30 && i.h > 10)
        .slice(0, 10)
    );
    console.log("VISIBLE INPUTS:", JSON.stringify(inputs, null, 0));
  } catch (err) { console.log(`\n=== ${name} ERR: ${err.message.split("\n")[0]} ===`); }
  await page.close().catch(() => {});
}

await inspectInputs("PPH /freelance-jobs", "https://www.peopleperhour.com/freelance-jobs");
await inspectInputs("Indeed .com", "https://www.indeed.com/");
await browser.close();