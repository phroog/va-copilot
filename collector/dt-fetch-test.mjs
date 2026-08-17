const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();

const HOSTS = [/guru\.com/, /freelancer\.com/, /workingnomads\.com/, /remoteok\.com/, /jobspresso\.co/];

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

const EXPR = `(async () => {
  try {
    const r = await fetch(location.href, { credentials: "include" });
    const text = await r.text();
    return JSON.stringify({ status: r.status, bytes: text.length, isHtml: /<html/i.test(text.slice(0, 200)) });
  } catch (e) { return JSON.stringify({ status: "ERR", bytes: 0, isHtml: false, err: e.message }); }
})()`;

for (const host of HOSTS) {
  const target = list.find((t) => t.type === "page" && host.test(t.url || ""));
  if (!target) { console.log(host, "-> kein Tab offen (skip)"); continue; }
  try {
    const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
    const sid = a.sessionId;
    await send("Runtime.enable", {}, sid);
    const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
    console.log(host.source, "->", target.url.slice(0, 70), "|", res.result.value);
  } catch (e) {
    console.log(host.source, "-> attach err", e.message);
  }
}
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);