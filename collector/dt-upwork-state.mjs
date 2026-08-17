import fs from "fs";
const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
const targets = list.filter((t) => t.type === "page" && (t.url || "").includes("upwork.com"));
console.log("upwork tabs:", targets.length);
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((r) => pending.set(mid, r));
}
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

for (const t of targets) {
  const a = await send("Target.attachToTarget", { targetId: t.id, flatten: true });
  const sid = a.result.sessionId;
  const res = await send("Runtime.evaluate", {
    expression: `JSON.stringify({title: document.title, text: (document.body.innerText||'').slice(0,600)})`,
    returnByValue: true,
  }, sid);
  let info = {};
  try { info = JSON.parse(res.result.result.value); } catch {}
  console.log("\n=====", t.url.slice(0, 90));
  console.log(info.title);
  console.log("TEXT:", (info.text || "").slice(0, 400));
}
process.exit(0);
