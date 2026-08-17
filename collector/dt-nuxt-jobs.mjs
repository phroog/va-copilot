const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url || ""));
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

const expr = `(() => {
  const N = window.__NUXT__ || {};
  const probe = [];
  // recursive scan for any value containing a job id pattern or keys like title/url
  const seen = new Set();
  const walk = (obj, path, depth) => {
    if (depth > 8) return;
    if (probe.length > 40) return;
    if (obj === null || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const p = path + "." + k;
      if (seen.has(p)) continue;
      seen.add(p);
      if (typeof v === "string" && /jobs\//.test(v) && v.length < 200) {
        probe.push({ p, v: v.slice(0, 120) });
      }
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0];
        if (first && typeof first === "object" && (first.title || first.legacyId || first.id)) {
          probe.push({ p: p + "[0]", v: JSON.stringify({ title: first.title, id: first.id || first.legacyId, url: first.url }).slice(0, 300) });
        }
        if (depth < 6) walk(first, p + "[0]", depth + 1);
      } else if (v && typeof v === "object") {
        walk(v, p, depth + 1);
      }
    }
  };
  walk(N, "__NUXT__", 0);
  return JSON.stringify({ topKeys: Object.keys(N), probe });
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sid);
console.log("RAW:", JSON.stringify(res).slice(0, 500));
if (res && res.result) console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
else console.log("no result:", res && res.exceptionDetails && JSON.stringify(res.exceptionDetails).slice(0, 500));
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
