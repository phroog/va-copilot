const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /onlinejobs\.ph/.test(t.url || ""));
if (!target) { console.log("no tab"); process.exit(1); }
console.log("URL:", target.url);

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

const EXPR = `(async () => {
  const r = await fetch(location.href, { credentials: "include" });
  const text = await r.text();
  const doc = new DOMParser().parseFromString(text, "text/html");
  const regexCount = (text.match(/\\/jobseekers\\/job\\//g) || []).length;
  const aCount = doc.querySelectorAll("a").length;
  const jobA = doc.querySelectorAll("a[href*='jobseekers']");
  const anchors = Array.from(doc.querySelectorAll("a")).map((x) => x.getAttribute("href")).filter(Boolean).slice(0, 15);
  return JSON.stringify({
    status: r.status,
    bytes: text.length,
    regexCount,
    aCount,
    jobATotal: jobA.length,
    jobASample: Array.from(jobA).slice(0, 3).map((x) => x.getAttribute("href")),
    firstAnchors: anchors,
  });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);