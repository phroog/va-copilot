import fs from "fs";

const BASE = "http://127.0.0.1:9222";
const OUT = "C:/Users/Surface/AppData/Local/Temp/opencode";

const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();

let target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url));
if (!target) {
  console.log("no upwork search tab found");
  process.exit(1);
}
console.log("TARGET:", target.url);

const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let msgId = 0;
const pending = new Map();
let sessId = null;
let setupDone = false;

function send(method, params = {}, sid = null) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((resolve) => pending.set(id, resolve));
}

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else {
    handleEvent(m);
  }
};

const requests = [];
const bodies = new Map();

function handleEvent(m) {
  const p = m.params || {};
  if (m.method === "Target.attachedToTarget") {
    if (!setupDone && p.sessionId) {
      setupDone = true;
      sessId = p.sessionId;
      console.log("attached:", sessId);
      setup(sessId);
    }
  } else if (m.method === "Page.frameNavigated") {
    console.log("NAV:", p.frame && p.frame.url);
  } else if (m.method === "Network.requestWillBeSent") {
    const { request, type } = p;
    if (request) {
      const url = request.url || "";
      if (/graphql|api\.upwork|freelance/gi.test(url) || (type === "Fetch" && /upwork\.com/.test(url))) {
        requests.push({ ts: Date.now(), method: request.method, url, type, postData: request.postData || "" });
      }
    }
  } else if (m.method === "Network.responseReceived") {
    const { url, response } = p;
    if (url && /graphql|api\.upwork|freelance/gi.test(url)) {
      bodies.set(p.requestId, { status: response && response.status, url });
    }
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
  await send("Page.enable", {}, sid);
  console.log("--- reload ---");
  await send("Page.reload", { ignoreCache: true }, sid);
  monitor(sid);
}

async function monitor(sid) {
  const deadline = Date.now() + 70000;
  while (Date.now() < deadline) {
    const nav = await send("Page.getNavigationHistory", {}, sid);
    if (nav.result) {
      const idx = nav.result.currentIndex;
      const cur = nav.result.entries[idx] && nav.result.entries[idx].url;
      if (cur) console.log("URL:", cur.includes("__cf_chl_tk") ? "CF-CHALLENGE" : cur);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(`CAPTURED ${requests.length} requests`);
  requests.forEach((r) => {
    console.log("\n=== " + r.method + " " + r.url + " [" + r.type + "]");
    if (r.postData) {
      console.log("postData:", r.postData.length > 8000 ? r.postData.slice(0, 8000) + " ...[trunc]" : r.postData);
    }
  });
  let n = 0;
  bodies.forEach((v, k) => {
    if (typeof v === "object" && "body" in v) {
      const safe = (v.url || "resp").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 50);
      fs.writeFileSync(`${OUT}/gql_${n++}_${safe}.json`, v.body);
      console.log("saved body", n, "->", v.url, "| status", v.status, "| bytes", v.body.length);
    }
  });
  fs.writeFileSync(`${OUT}/upwork_requests.json`, JSON.stringify(requests, null, 2));
  process.exit(0);
}

const attach = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
if (!setupDone && attach.result && attach.result.sessionId) {
  setupDone = true;
  sessId = attach.result.sessionId;
  await setup(sessId);
}
if (!setupDone) process.exit(1);
await new Promise((r) => setTimeout(r, 75000));
process.exit(0);
