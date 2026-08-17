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

const created = await send("Target.createTarget", { url: "https://www.reddit.com/r/virtualassistants/new/" });
const targetId = created.targetId;
console.log("created reddit tab:", targetId);
await new Promise((r) => setTimeout(r, 6000));

const a = await send("Target.attachToTarget", { targetId, flatten: true });
const sid = a.sessionId;
await send("Runtime.enable", {}, sid);

const EXPR = `(async () => {
  try {
    const r = await fetch("https://www.reddit.com/r/virtualassistants/new.json?limit=5", { credentials: "include" });
    const t = await r.text();
    let titles = [];
    try { titles = (JSON.parse(t).data.children || []).map((c) => c.data.title); } catch {}
    return JSON.stringify({ status: r.status, bytes: t.length, titles });
  } catch (e) { return JSON.stringify({ status: "ERR", err: e.message }); }
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
console.log("REDDIT browser-context:", res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);