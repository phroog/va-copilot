import { chromium } from "playwright";
import fs from "fs";

const CDP = "http://127.0.0.1:9222";

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

let page = (context.pages() || []).find((p) => /upwork\.com\/nx\/search\/jobs/.test(p.url() || ""));
if (!page) {
  page = (context.pages() || []).find((p) => (p.url() || "").includes("upwork.com"));
}
if (!page) {
  console.log("no upwork tab; opening");
  page = await context.newPage();
  await page.goto("https://www.upwork.com/nx/search/jobs?sort=recency", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
}
console.log("TAB:", page.url());

const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");

const requests = [];
const responseBodies = [];

cdp.on("Network.requestWillBeSent", (e) => {
  const { url, method, postData, headers } = e.request;
  const isApi =
    /graphql|api\.upwork|freelance/gi.test(url) ||
    (method === "POST" && /api|graphql|jobs/i.test(url));
  if (isApi && /graphql|api|freelance|gql/gi.test(url)) {
    requests.push({
      ts: Date.now(),
      method,
      url,
      type: e.type,
      postData: postData || "",
      headers: {
        contentType: headers["content-type"] || "",
        accept: headers.accept || "",
        xRequestedWith: headers["x-requested-with"] || "",
      },
    });
  }
});

cdp.on("Network.responseReceived", (e) => {
  const { url, response } = e;
  if (!url.includes("graphql")) return;
  cdp
    .send("Network.getResponseBody", { requestId: e.requestId })
    .then(({ body }) => {
      responseBodies.push({ url, status: response.status, body });
    })
    .catch(() => {});
});

console.log("--- reloading to capture the feed request ---");
await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});

await new Promise((r) => setTimeout(r, 9000));

console.log(`CAPTURED ${requests.length} API requests`);
requests.forEach((r) => {
  console.log("\n=== ", r.method, r.url);
  console.log("  type:", r.type, "| content-type:", r.headers.contentType);
  if (r.postData) {
    const preview = r.postData.length > 4000 ? r.postData.slice(0, 4000) + " ...[trunc]" : r.postData;
    console.log("  postData:", preview);
  }
});

console.log(`\nGRAPHQL RESPONSES: ${responseBodies.length}`);
responseBodies.forEach((r) => {
  const name = r.url.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
  fs.writeFileSync(`C:/Users/Surface/AppData/Local/Temp/opencode/graphql_${name}.json`, r.body);
  console.log("  saved response ->", name, "| status", r.status, "| bytes", r.body.length);
});

fs.writeFileSync(
  "C:/Users/Surface/AppData/Local/Temp/opencode/upwork_requests.json",
  JSON.stringify(requests, null, 2)
);

await browser.close();
console.log("\nDONE");
