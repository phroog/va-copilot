const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /upwork\.com/.test(t.url || ""));
if (!target) { console.log("no upwork tab"); process.exit(1); }

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

const EXPR = `(() => {
  const c = document.cookie;
  const vt = (c.match(/(?:^|;\\s*)UniversalSearchNuxt_vt=([^;]*)/) || [])[1] || null;
  const loggedIn = /\\b(_upw_ses|UniversalSearchNuxt_vt)\\b/.test(c);
  return JSON.stringify({ hasVtCookie: !!vt, vtLen: vt ? vt.length : 0, vtHead: vt ? vt.slice(0, 30) : null, cookieCount: c.split(";").length });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
console.log("TAB:", target.url.slice(0, 60));
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);