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

const EXPR = `(async () => {
  const r = await fetch(location.href, { credentials: "include" });
  const text = await r.text();
  const doc = new DOMParser().parseFromString(text, "text/html");
  const out = [];
  doc.querySelectorAll(".job_seen_beacon, .jobsearch-ResultJob").forEach((c) => {
    const t = c.querySelector("a.jcs-JobTitle, h3 a");
    if (!t) return;
    const url = t.href || (t.closest("a") ? t.closest("a").href : "");
    const desc = (c.querySelector(".job-snippet, [class*='snippet']")?.textContent || "").trim().slice(0, 80);
    out.push({ title: t.textContent.trim().slice(0, 50), url: url.slice(0, 60), desc });
  });
  return JSON.stringify({ count: out.length, sample: out.slice(0, 3) });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);