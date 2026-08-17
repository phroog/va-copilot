import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

async function inspectInputs(name, url, waitMs = 4000) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(waitMs);
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input"))
        .map((i) => ({
          type: i.type, name: i.name, id: i.id, ph: i.placeholder,
          cls: (i.className || "").toString().slice(0, 30),
          w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height,
        }))
        .slice(0, 14)
    );
    console.log(`=== ${name} (${page.url()}) ===`);
    console.log(JSON.stringify(inputs, null, 0));
  } catch (err) { console.log(`=== ${name} ERR: ${err.message.split("\n")[0]} ===`); }
  await page.close().catch(() => {});
}

await inspectInputs("PPH /freelance-jobs inputs", "https://www.peopleperhour.com/freelance-jobs");
await browser.close();