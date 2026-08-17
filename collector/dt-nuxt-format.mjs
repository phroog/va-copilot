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
  const html = document.documentElement.outerHTML;
  const idx = html.indexOf("__NUXT__");
  const jobsSearchIdx = html.indexOf("jobsSearch");
  return JSON.stringify({
    nuxtIdx: idx,
    jobsSearchIdx,
    aroundNuxt: idx >= 0 ? html.slice(idx, idx + 300) : "not found",
    aroundJobs: jobsSearchIdx >= 0 ? html.slice(jobsSearchIdx - 200, jobsSearchIdx + 200) : "not found",
  });
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sid);
console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
