import fs from "fs";
const BASE = "http://127.0.0.1:9222";
const OUT = "C:/Users/Surface/AppData/Local/Temp/opencode";

const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /per_page=50/.test(t.url || ""));
if (!target) target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url || ""));
console.log("TARGET:", target.url);

const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
let sessId = null;
let setupDone = false;
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((r) => pending.set(mid, r));
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
  if (m.method === "Target.attachedToTarget" && !setupDone && p.sessionId) {
    setupDone = true; sessId = p.sessionId; setup(sessId);
  } else if (m.method === "Network.requestWillBeSent") {
    const { request, type } = p;
    if (request && (type === "Fetch" || type === "XHR")) {
      const url = request.url || "";
      if (/graphql|api\.upwork|freelance/.test(url) || /upwork\.com/.test(url)) {
        requests.push({ ts: Date.now(), method: request.method, url, type, postData: request.postData || "" });
      }
    }
  } else if (m.method === "Network.responseReceived") {
    const { url, response } = p;
    if (url && /graphql/.test(url)) bodies.set(p.requestId, { status: response && response.status, url });
  } else if (m.method === "Network.loadingFinished") {
    const rid = p.requestId;
    const meta = bodies.get(rid);
    if (meta) {
      send("Network.getResponseBody", { requestId: rid }, sessId).then((res) => {
        if (res && res.result) bodies.set(rid + "_body", { ...meta, body: res.result.body });
      });
    }
  }
}

async function setup(sid) {
  await send("Network.enable", {}, sid);
  await send("Runtime.enable", {}, sid);
  console.log("--- wheel-scroll pagination attempt ---");
  for (let i = 0; i < 6; i++) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 960, y: 600 }, sid);
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 960, y: 600, deltaX: 0, deltaY: 2400 }, sid);
    await new Promise((r) => setTimeout(r, 2000));
  }
  await new Promise((r) => setTimeout(r, 3000));
  console.log("requests after wheel:", requests.length);
  if (!requests.some((r) => r.url.includes("graphql"))) {
    console.log("--- fallback: reload warm tab ---");
    await send("Page.reload", { ignoreCache: false }, sid);
  }
  await new Promise((r) => setTimeout(r, 20000));
  finish();
}

function finish() {
  console.log(`\nCAPTURED ${requests.length} requests`);
  requests.forEach((r) => {
    console.log("\n=== " + r.method + " " + r.url + " [" + r.type + "]");
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
}

const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
if (!setupDone && a.result && a.result.sessionId) {
  setupDone = true; sessId = a.result.sessionId; await setup(sessId);
}
if (!setupDone) process.exit(1);
await new Promise((r) => setTimeout(r, 40000));
process.exit(0);
