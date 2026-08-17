import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

async function inspect(name, url, waitMs = 3500) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(waitMs);
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input"))
        .map((i) => ({ type: i.type, name: i.name, id: i.id, ph: i.placeholder, cls: (i.className||"").toString().slice(0,40) }))
        .slice(0, 10)
    );
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .map((a) => ({ href: (a.getAttribute("href")||"").slice(0, 70), txt: (a.textContent||"").trim().slice(0, 40) }))
        .slice(0, 8)
    );
    console.log(`\n=== ${name} (${url}) ===`);
    console.log("TITLE:", (await page.title()).slice(0, 60));
    console.log("URL:", page.url());
    console.log("INPUTS:", JSON.stringify(inputs));
    console.log("LINKS:", JSON.stringify(links));
  } catch (err) { console.log(`\n=== ${name} ERR: ${err.message.split("\n")[0]} ===`); }
  await page.close().catch(() => {});
}

await inspect("Jobspresso", "https://jobspresso.co/");
await inspect("PeoplePerHour", "https://www.peopleperhour.com/services/data+entry?ref=search");
await browser.close();