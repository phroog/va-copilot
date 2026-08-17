import fs from "fs";
const BASE = "http://127.0.0.1:9222";
const OUT = "C:/Users/Surface/AppData/Local/Temp/opencode";

const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /per_page=50/.test(t.url || ""));
if (!target) target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url || ""));
if (!target) { console.log("no tab"); process.exit(1); }
console.log("TARGET:", target.url);

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

const requests = [];
const bodies = new Map();

function handleEvent(m) {
  const p = m.params || {};
  if (m.method === "Network.requestWillBeSent") {
    const { request, type } = p;
    if (request && (type === "Fetch" || type === "XHR")) {
      const url = request.url || "";
      if (/graphql|api\.upwork|freelance/.test(url)) {
        requests.push({ ts: Date.now(), method: request.method, url, type, postData: request.postData || "" });
      }
    }
  } else if (m.method === "Network.responseReceived") {
    const { url, response } = p;
    if (url && /graphql/.test(url)) bodies.set(p.requestId, { status: response && response.status, url });
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
console.log("session:", sessId);
await send("Network.enable", {}, sessId);
await send("Page.enable", {}, sessId);

console.log("--- reload warm tab ---");
try { await send("Page.reload", { ignoreCache: false }, sessId); } catch (e) { console.log("reload err", e && e.message); }

for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  try {
    const nav = await send("Page.getNavigationHistory", {}, sessId);
    if (nav && nav.entries) {
      const cur = nav.entries[nav.currentIndex].url;
      console.log(`t+${(i + 1) * 4}s URL:`, cur.includes("__cf_chl_tk") ? "CF-CHALLENGE" : cur);
    }
  } catch {}
}

console.log(`CAPTURED ${requests.length} requests`);
requests.forEach((r) => {
  console.log("\n=== " + r.method + " " + r.url);
  if (r.postData) console.log("postData:\n" + r.postData);
});
let n = 0;
bodies.forEach((v, k) => {
  if (typeof v === "object" && "body" in v) {
    const safe = (v.url || "resp").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
    fs.writeFileSync(`${OUT}/gql_${n++}_${safe}.json`, v.body);
    console.log("saved body", n, "->", v.url, "| status", v.status, "| bytes", v.body.length);
  }
});
fs.writeFileSync(`${OUT}/upwork_requests.json`, JSON.stringify(requests, null, 2));
process.exit(0);
