import fs from "fs";
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
let sessId = null;
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((resolve) => pending.set(mid, (m) => resolve(m.result || m.error)));
}
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else handleEvent(m);
};

const allReqs = [];
const bodies = new Map();

function handleEvent(m) {
  const p = m.params || {};
  if (m.method === "Network.requestWillBeSent") {
    const { request, type } = p;
    const url = request ? request.url : "(no url)";
    if (url.startsWith("http") && (type === "Fetch" || type === "XHR")) {
      allReqs.push({ method: request.method, type, url, postData: request.postData || "" });
      if (/graphql|api\.upwork|freelance|jobs/i.test(url)) {
        bodies.set(p.requestId, { url, hasGraphql: /graphql/.test(url) });
      }
    }
  } else if (m.method === "Network.webSocketCreated") {
    allReqs.push({ type: "WS-created", url: p.url });
  } else if (m.method === "Network.loadingFinished") {
    const rid = p.requestId;
    if (bodies.has(rid)) {
      send("Network.getResponseBody", { requestId: rid }, sessId).then((r) => {
        if (r && r.body) bodies.set(rid + "_body", { ...bodies.get(rid), body: r.body });
      });
    }
  }
}

const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
sessId = a.sessionId;
await send("Network.enable", {}, sessId);
console.log("--- reload (broad capture) ---");
await send("Page.reload", { ignoreCache: false }, sessId);

for (let i = 0; i < 9; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  try {
    const nav = await send("Page.getNavigationHistory", {}, sessId);
    if (nav && nav.entries) {
      const cur = nav.entries[nav.currentIndex].url;
      if (i === 0 || i === 8) console.log(`t+${(i + 1) * 4}s URL:`, cur.includes("__cf_chl_tk") ? "CF-CHALLENGE" : cur);
    }
  } catch {}
}
await new Promise((r) => setTimeout(r, 5000));

console.log(`TOTAL http/xhr/ws requests: ${allReqs.length}`);
allReqs.forEach((r) => console.log(`  [${r.type}] ${r.method} ${r.url.slice(0, 110)}`));

let n = 0;
bodies.forEach((v, k) => {
  if (typeof v === "object" && "body" in v) {
    const safe = (v.url || "resp").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
    fs.writeFileSync(`${OUT}/gql_${n++}_${safe}.json`, v.body);
    console.log("saved body", n, "->", v.url, "| bytes", v.body.length);
  }
});
fs.writeFileSync(`${OUT}/upwork_all_requests.json`, JSON.stringify(allReqs, null, 2));
process.exit(0);
