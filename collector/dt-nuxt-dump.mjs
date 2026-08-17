const BASE = "http://127.0.0.1:9222";
const OUT = "C:/Users/Surface/AppData/Local/Temp/opencode";
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
  const seen = new WeakSet();
  let s;
  try {
    s = JSON.stringify(N, function (k, v) {
      if (v && typeof v === "object") {
        if (seen.has(v)) return "[circular]";
        seen.add(v);
      }
      return v;
    });
  } catch (e) {
    return "ERR:" + e.message;
  }
  return s;
})()`;

const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sid);
const val = res && res.result ? res.result.value : null;
if (typeof val === "string" && !val.startsWith("ERR:")) {
  console.log("NUXT json length:", val.length);
  const { writeFileSync } = await import("fs");
  writeFileSync(`${OUT}/nuxt_payload.json`, val);
  console.log("saved to nuxt_payload.json");
} else {
  console.log("FAILED:", String(val));
}
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
