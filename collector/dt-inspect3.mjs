import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

async function check(name, url, boxSel, waitMs = 4000) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(waitMs);
    const loc = page.locator(boxSel).first();
    const state = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: r.width, h: r.height, display: cs.display, visibility: cs.visibility, offsetParent: el.offsetParent !== null };
    }).catch((e) => ({ err: e.message.split("\n")[0] }));
    console.log(`=== ${name}: box state =`, JSON.stringify(state));
    const forms = await page.evaluate(() =>
      Array.from(document.querySelectorAll("form")).map((f) => ({
        action: f.getAttribute("action"), cls: (f.className || "").toString().slice(0, 40),
        inputs: Array.from(f.querySelectorAll("input")).map((i) => i.name || i.id).join(","),
      })).slice(0, 5)
    );
    console.log("FORMS:", JSON.stringify(forms));
  } catch (err) { console.log(`=== ${name} ERR: ${err.message.split("\n")[0]} ===`); }
  await page.close().catch(() => {});
}

await check("Jobspresso #s", "https://jobspresso.co/", 'input#s');
await check("PPH /freelance-jobs", "https://www.peopleperhour.com/freelance-jobs", 'input[placeholder*="Search"], input[type="search"], input[name="q"]');
await browser.close();