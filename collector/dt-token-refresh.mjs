const BASE = "http://127.0.0.1:9222";
const ver = await (await fetch(`${BASE}/json/version`)).json();

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

const created = await send("Target.createTarget", { url: "https://www.upwork.com/nx/search/jobs?sort=recency" });
console.log("new upwork tab:", created.targetId);
await new Promise((r) => setTimeout(r, 10000));

const a = await send("Target.attachToTarget", { targetId: created.targetId, flatten: true });
const sid = a.sessionId;
await send("Runtime.enable", {}, sid);

const QUERY = `query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!){ search { universalSearchNuxt { visitorJobSearchV1(request: $requestVariables) { paging { total } results { id title } } } } }`;
const expr = `(async () => {
  const m = (document.cookie.match(/(?:^|;\\s*)UniversalSearchNuxt_vt=([^;]*)/) || [])[1] || null;
  const r = await fetch("/api/graphql/v1?alias=visitorJobSearch", { method: "POST", credentials: "include",
    headers: { "content-type": "application/json", "authorization": "Bearer " + m, "x-upwork-accept-language": "en-US" },
    body: JSON.stringify({ query: ${JSON.stringify(QUERY)}, variables: { requestVariables: { sort: "recency", highlight: true, paging: { offset: 0, count: 3 } } } }) });
  const t = await r.text();
  return JSON.stringify({ hasToken: !!m, tokenLen: m ? m.length : 0, tokenHead: m ? m.slice(0, 26) : null, status: r.status, head: t.slice(0, 100) });
})()`;
const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sid);
console.log("FRESH TAB RESULT:", res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);