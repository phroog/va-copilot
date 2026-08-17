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

const QUERY = `query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
  search {
    universalSearchNuxt {
      visitorJobSearchV1(request: $requestVariables) {
        paging { total offset count }
        results {
          id
          title
          description
          relevanceEncoded
          ontologySkills { uid prefLabel highlighted }
          jobTile {
            job {
              id
              ciphertext: cipherText
              jobType
              hourlyBudgetMax
              hourlyBudgetMin
              contractorTier
              createTime
              publishTime
              hourlyEngagementDuration { rid label weeks }
              fixedPriceAmount { isoCurrencyCode amount }
              fixedPriceEngagementDuration { rid label weeks }
            }
          }
        }
      }
    }
  }
}`;

const expr = `(async () => {
  const body = JSON.stringify({ query: ${JSON.stringify(QUERY)}, variables: { requestVariables: { sort: "recency", highlight: true, paging: { offset: 0, count: 5 } } } });
  try {
    const r = await fetch("/api/graphql/v1?alias=visitorJobSearch", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body,
    });
    const t = await r.text();
    return JSON.stringify({ status: r.status, ct: r.headers.get("content-type"), len: t.length, head: t.slice(0, 400) });
  } catch (e) {
    return "ERR: " + e.message;
  }
})()`;
const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sid);
if (res.result && res.result.value !== undefined) console.log(res.result.value);
else console.log("FAIL", JSON.stringify(res).slice(0, 400));
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
