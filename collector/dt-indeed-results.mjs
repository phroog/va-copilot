const BASE = "http://127.0.0.1:9222";
const ver = await (await fetch(`${BASE}/json/version`)).json();
const list = await (await fetch(`${BASE}/json/list`)).json();
let target = list.find((t) => t.type === "page" && /indeed\.com/.test(t.url || ""));
if (!target) { console.log("no indeed tab"); process.exit(1); }

const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((resolve) => pending.set(mid, (m) => resolve(m.result || m.error)));
}
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
const sid = a.sessionId;
await send("Runtime.enable", {}, sid);
await send("Page.enable", {}, sid);

console.log("navigating to results...");
await send("Page.navigate", { url: "https://at.indeed.com/jobs?q=virtual%20assistant&l=" }, sid);
await new Promise((r) => setTimeout(r, 9000));

const EXPR = `(() => {
  const bodyText = document.body ? document.body.innerText : "";
  const challenged = /captcha|confirm you\\'re human|unusual traffic|verify you are human/i.test(bodyText.slice(0, 2000));
  const cards = {
    beacon: document.querySelectorAll('.job_seen_beacon').length,
    resultJob: document.querySelectorAll('.jobsearch-ResultJob').length,
    sliderItem: document.querySelectorAll('[data-testid="slider_item"]').length,
    jobTitle: document.querySelectorAll('a.jcs-JobTitle').length,
    dataJob: document.querySelectorAll('[data-jk]').length,
    article: document.querySelectorAll('li[data-testid="job-card"], [data-testid="job-card"]').length,
  };
  const sampleTitles = Array.from(document.querySelectorAll('a.jcs-JobTitle, [data-testid="job-card"] a, h2 a'))
    .slice(0, 4).map((x) => x.textContent.trim().slice(0, 60));
  return JSON.stringify({ url: location.href.slice(0, 90), challenged, cards, sampleTitles, head: bodyText.slice(0, 150) });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);