const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /onlinejobs\.ph/.test(t.url || ""));
if (!target) { console.log("no tab"); process.exit(1); }

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
  const now = Date.now();
  const out = [];
  doc.querySelectorAll('a[href*="/jobseekers/job/"]').forEach((it) => {
    const raw = it.querySelector("p[data-temp]")?.getAttribute("data-temp") || "";
    const m = raw.match(/(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2}):?(\\d{2})?/);
    if (!m) return;
    const iso = m[1] + "-" + m[2] + "-" + m[3] + "T" + m[4] + ":" + m[5] + ":" + (m[6] || "00") + "+08:00";
    const ts = Date.parse(iso);
    const ageMin = Math.round((now - ts) / 60000);
    out.push({ raw, iso, ageMin, inFuture: ts > now });
  });
  const future = out.filter((o) => o.inFuture);
  return JSON.stringify({ sample: out.slice(0, 4), total: out.length, inFuture: future.length, maxAgeMin: out.length ? Math.max(...out.map((o) => o.ageMin)) : null });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);