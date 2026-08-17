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

const captures = [];

function handleEvent(m) {
  const p = m.params || {};
  if (m.method === "Network.requestWillBeSent") {
    const url = (p.request && p.request.url) || "";
    if (/graphql/i.test(url)) {
      captures.push({ url, method: p.request.method, headers: p.request.headers });
    }
  } else if (m.method === "Network.responseReceived") {
    const url = (p.response && p.response.url) || "";
    if (/graphql/i.test(url)) {
      console.log("RESPONSE", p.response.status, "for", url);
    }
  }
}

const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
sessId = a.sessionId;
await send("Network.enable", {}, sessId);
await send("Runtime.enable", {}, sessId);

const CLICK = `
(function () {
  const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const cand = inputs.filter((i) => i.offsetParent !== null);
  if (!cand.length) return "none";
  cand[0].click();
  return "clicked " + (cand[0].getAttribute("aria-label") || cand[0].className);
})()
`;
const r = await send("Runtime.evaluate", { expression: CLICK, returnByValue: true }, sessId);
console.log("CLICK:", r.result.value);
await new Promise((res) => setTimeout(res, 8000));

console.log(`captured ${captures.length} graphql request header sets`);
captures.forEach((c, i) => {
  console.log(`\n[${i}] ${c.method} ${c.url}`);
  console.log(JSON.stringify(c.headers, null, 2));
});
fs.writeFileSync(`${OUT}/gql_headers.json`, JSON.stringify(captures, null, 2));
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
