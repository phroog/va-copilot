const BASE = "http://127.0.0.1:9222";
const ver = await (await fetch(`${BASE}/json/version`)).json();
const list = await (await fetch(`${BASE}/json/list`)).json();
let target = list.find((t) => t.type === "page" && /hubstafftalent\.net/.test(t.url || ""));
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
  const links = Array.from(document.querySelectorAll('a[href^="/jobs/"]'))
    .filter((x) => { const h = x.getAttribute('href') || ''; return h.length > '/jobs/'.length && h !== '/jobs/new'; });
  const out = [];
  links.slice(0, 3).forEach((x) => {
    const card = x.closest('div');
    let container = card;
    for (let i = 0; i < 4 && container.parentElement && container.parentElement !== document.body; i++) {
      const parent = container.parentElement;
      if ((parent.querySelectorAll('a[href^="/jobs/"]').length || 0) > 1) { container = parent; break; }
      container = parent;
    }
    out.push({ title: x.textContent.trim().slice(0, 50), href: (x.getAttribute('href')||'').slice(0, 60), containerCls: (container.className||'').toString().slice(0, 60), cardText: container.innerText.replace(/\\n+/g,' | ').slice(0, 220) });
  });
  return JSON.stringify({ count: links.length, out });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);