const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /onlinejobs\.ph/.test(t.url || ""));
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

const EXPR = `(() => {
  const items = document.querySelectorAll('a[href*="/jobseekers/job/"]');
  const out = [];
  items.forEach((it) => {
    const h4 = it.querySelector("h4");
    if (!h4) return;
    const title = h4.textContent.replace((h4.querySelector(".badge")?.textContent || ""), "").trim();
    const p = it.querySelector("p[data-temp]");
    if (p) out.push({
      title: title.slice(0, 55),
      dataTemp: p.getAttribute("data-temp"),
      emText: p.querySelector("em")?.textContent?.trim() || "",
    });
  });
  return JSON.stringify({ sample: out.slice(0, 8), hasAttr: out.filter((o) => o.dataTemp).length });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);