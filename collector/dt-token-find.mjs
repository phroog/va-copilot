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
  const token = "oauth2v2_int_361258d50a2afc1c850428a4b1c79e14";
  const hits = [];
  const ls = Object.keys(localStorage);
  for (const k of ls) {
    const v = localStorage.getItem(k);
    if (v && (v.includes(token) || /oauth2v2_int_/.test(v))) hits.push({ store: "localStorage", k, v: v.slice(0, 300) });
  }
  try {
    const ss = Object.keys(sessionStorage);
    for (const k of ss) {
      const v = sessionStorage.getItem(k);
      if (v && (v.includes(token) || /oauth2v2_int_/.test(v))) hits.push({ store: "sessionStorage", k, v: v.slice(0, 300) });
    }
  } catch {}
  // cookies
  const cks = document.cookie.split(";").map((c) => c.trim()).filter((c) => /oauth|upw|token|auth/i.test(c));
  hits.push({ store: "cookies", list: cks.slice(0, 20) });
  // any global var
  let g = "none";
  try { if (window.__XSRF) g = "XSRF"; } catch {}
  return JSON.stringify(hits, null, 2);
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
