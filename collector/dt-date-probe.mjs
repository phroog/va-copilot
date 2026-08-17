const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();

const TARGETS = [
  { key: "guru", host: /guru\.com/, items: ".jobRecord" },
  { key: "freelancer", host: /freelancer\.com/, items: ".JobSearchCard-item" },
];

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

for (const t of TARGETS) {
  const target = list.find((x) => x.type === "page" && t.host.test(x.url || ""));
  if (!target) { console.log(t.key, "-> kein Tab"); continue; }
  const items = JSON.stringify(t.items);
  const EXPR = `(() => {
    const cards = document.querySelectorAll(${items});
    const out = [];
    cards.forEach((c) => {
      const timeEls = [];
      c.querySelectorAll("time, [datetime], [class*='date'], [class*='time'], [class*='ago']").forEach((el) => {
        timeEls.push({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 40), dt: el.getAttribute("datetime") || "", txt: el.textContent.trim().slice(0, 40) });
      });
      const agoMatches = (c.textContent.match(/[A-Za-z0-9 ,]*(?:ago|today|yesterday|posted|on [A-Z][a-z]{2} \d{1,2})/g) || []).slice(0, 3);
      out.push({ title: (c.querySelector("h2 a, h3 a, .jobRecord__title a, .JobSearchCard-primary-heading-link")?.textContent || "").trim().slice(0, 40), timeEls: timeEls.slice(0, 3), ago: agoMatches });
    });
    return JSON.stringify(out.slice(0, 3));
  })()`;
  try {
    const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
    const sid = a.sessionId;
    await send("Runtime.enable", {}, sid);
    const res = await send("Runtime.evaluate", { expression: EXPR, returnByValue: true }, sid);
    console.log(t.key, "->", res.result.value);
  } catch (e) { console.log(t.key, "-> err", e.message); }
}
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);