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
  const links = Array.from(document.querySelectorAll('a'))
    .map((x) => x.getAttribute('href') || '')
    .filter((h) => /job|talent/i.test(h))
    .slice(0, 20);
  // find likely job cards: elements with a heading + an anchor
  const cards = [];
  document.querySelectorAll('a').forEach((x) => {
    const h = x.getAttribute('href') || '';
    if (/job/.test(h) && (x.textContent || '').trim().length > 5) {
      cards.push({ text: x.textContent.trim().slice(0, 60), href: h.slice(0, 80) });
    }
  });
  // first container with many job links
  const html = document.body.innerHTML;
  return JSON.stringify({ links, cards: cards.slice(0, 8), snippet: html.slice(0, 600) });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);