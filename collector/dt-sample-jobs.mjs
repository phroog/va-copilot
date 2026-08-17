const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();

const QUERY = `query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
  search { universalSearchNuxt { visitorJobSearchV1(request: $requestVariables) {
    paging { total offset count }
    results {
      id title description
      ontologySkills { prefLabel }
      jobTile { job { jobType hourlyBudgetMin hourlyBudgetMax fixedPriceAmount { amount } publishTime } }
    }
  } } } }`;

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

async function evalOn(hostRe, expr) {
  const target = list.find((t) => t.type === "page" && hostRe.test(t.url || ""));
  if (!target) return null;
  const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
  const sid = a.sessionId;
  await send("Runtime.enable", {}, sid);
  const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sid);
  return res.result.value;
}

const UPWORK = `(async () => {
  const m = (document.cookie.match(/(?:^|;\\s*)UniversalSearchNuxt_vt=([^;]*)/) || [])[1];
  const r = await fetch("/api/graphql/v1?alias=visitorJobSearch", { method: "POST", credentials: "include",
    headers: { "content-type": "application/json", "authorization": "Bearer " + m, "x-upwork-accept-language": "en-US" },
    body: JSON.stringify({ query: ${JSON.stringify(QUERY)}, variables: { requestVariables: { sort: "recency", highlight: true, paging: { offset: 0, count: 15 } } } }) });
  const j = await r.json();
  const feed = j.data.search.universalSearchNuxt.visitorJobSearchV1;
  return JSON.stringify((feed.results || []).map((x) => ({ title: x.title, skills: (x.ontologySkills || []).map((s) => s.prefLabel).slice(0, 4) })));
})()`;

function htmlExpr(itemsSel, titleSel, key) {
  return `(async () => {
    const r = await fetch(location.href, { credentials: "include" });
    const text = await r.text();
    const doc = new DOMParser().parseFromString(text, "text/html");
    const out = [];
    doc.querySelectorAll(${JSON.stringify(itemsSel)}).forEach((it) => {
      const el = it.querySelector(${JSON.stringify(titleSel)});
      const t = el ? el.textContent.trim().replace(/\\uFFFD/g, "") : "";
      if (t.length > 3) out.push({ title: t.slice(0, 90) });
    });
    return JSON.stringify(out.slice(0, 15));
  })()`;
}

const samples = {};
samples.upwork = await evalOn(/upwork\.com/, UPWORK);
samples.onlinejobs = await evalOn(/onlinejobs\.ph/, htmlExpr('a[href*="/jobseekers/job/"]', "h4"));
samples.guru = await evalOn(/guru\.com/, htmlExpr(".jobRecord", ".jobRecord__title a, h2 a"));
samples.freelancer = await evalOn(/freelancer\.com/, htmlExpr(".JobSearchCard-item", ".JobSearchCard-primary-heading-link"));

try { ws.close(); } catch {}
console.log(JSON.stringify(samples, null, 1));
setTimeout(() => process.exit(0), 300);