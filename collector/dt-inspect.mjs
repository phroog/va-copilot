import { chromium } from "playwright";

const CDP = "http://localhost:9222";
const SITES = [
  { name: "OnlineJobs.ph", url: "https://www.onlinejobs.ph/jobseekers/jobsearch" },
  { name: "Indeed", url: "https://www.indeed.com/" },
  { name: "Freelancer.com", url: "https://www.freelancer.com/jobs" },
  { name: "Guru.com", url: "https://www.guru.com/d/jobs/" },
  { name: "RemoteOK", url: "https://remoteok.com/" },
  { name: "WorkingNomads", url: "https://www.workingnomads.com/jobs" },
  { name: "Jobspresso", url: "https://jobspresso.co/" },
  { name: "PeoplePerHour", url: "https://www.peopleperhour.com/" },
];

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

for (const site of SITES) {
  const page = await context.newPage();
  try {
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input"))
        .filter((i) => {
          const t = (i.type || "text").toLowerCase();
          return ["text", "search"].includes(t);
        })
        .map((i) => ({ type: i.type, name: i.name, id: i.id, ph: i.placeholder, dt: i.getAttribute("data-test"), ar: i.getAttribute("aria-label") }))
        .filter((i) => i.ph || i.name || i.id || i.dt || i.ar)
        .slice(0, 8)
    );
    console.log(`\n=== ${site.name} (${site.url}) ===`);
    console.log(JSON.stringify({ title: (await page.title()).slice(0, 50), inputs }, null, 0));
  } catch (err) {
    console.log(`\n=== ${site.name} ERR: ${err.message.split("\n")[0]} ===`);
  } finally {
    await page.close().catch(() => {});
  }
}

await browser.close();