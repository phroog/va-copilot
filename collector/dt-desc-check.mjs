const BASE = "http://127.0.0.1:9222";
const ver = await (await fetch(`${BASE}/json/version`)).json();
const list = await (await fetch(`${BASE}/json/list`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((resolve) => pending.set(mid, (m) => resolve(m.result || m.error)));
}
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };

const TARGETS = [
  { key: "onlinejobs", host: /onlinejobs\.ph/, items: 'a[href*="/jobseekers/job/"]', descSel: ".desc, .job-desc, p" },
  { key: "guru", host: /guru\.com/, items: ".jobRecord", descSel: "[class*='description'], [class*='desc'], p" },
  { key: "hubstaff", host: /hubstafftalent\.net/, items: 'a[href^="/jobs/"]', descSel: "[class*='description'], p" },
];

for (const t of TARGETS) {
  const target = list.find((x) => x.type === "page" && t.host.test(x.url || ""));
  if (!target) { console.log(t.key, "-> kein Tab"); continue; }
  const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
  const sid = a.sessionId;
  await send("Runtime.enable", {}, sid);
  const EXPR = `(() => {
    const cards = document.querySelectorAll(${JSON.stringify(t.items)});
    const lens = [];
    const samples = [];
    cards.forEach((c) => {
      const d = c.querySelector(${JSON.stringify(t.descSel)});
      const text = d ? d.textContent.trim() : "";
      lens.push(text.length);
      if (samples.length < 2) samples.push(text.slice(0, 120));
    });
    return JSON.stringify({ cards: cards.length, lens: lens.slice(0, 5), samples });
  })()`;
  const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
  console.log(t.key, "->", res.result.value);
}
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);