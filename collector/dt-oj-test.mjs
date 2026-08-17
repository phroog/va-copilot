const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /onlinejobs\.ph/.test(t.url || ""));
if (!target) { console.log("no onlinejobs tab"); process.exit(1); }
console.log("TARGET:", target.url);

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

const expr = `(async () => {
  const r = await fetch(location.href, { credentials: "include" });
  const text = await r.text();
  const count = (text.match(/\\/jobseekers\\/job\\//g) || []).length;
  const hasForm = /<form[^>]*jobsearch/i.test(text);
  return JSON.stringify({ status: r.status, bytes: text.length, jobLinks: count, isHtml: /<html/i.test(text.slice(0, 200)), hasForm });
})()`;
const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);