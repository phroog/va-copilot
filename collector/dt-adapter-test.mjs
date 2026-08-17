const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();

const TARGETS = [
  { key: "onlinejobs", host: /onlinejobs\.ph/, items: 'a[href*="/jobseekers/job/"]', title: `const h=it.querySelector("h4"); if(!h) return; title=h.textContent.replace((h.querySelector(".badge")?.textContent||""),"").trim(); url=it.href;` },
  { key: "guru", host: /guru\.com/, items: ".jobRecord", title: `const a=it.querySelector(".jobRecord__title a, h2 a"); if(!a) return; title=a.textContent.trim(); url=a.href;` },
  { key: "freelancer", host: /freelancer\.com/, items: ".JobSearchCard-item", title: `const a=it.querySelector(".JobSearchCard-primary-heading-link"); if(!a) return; title=a.textContent.trim(); url=a.href;` },
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
  if (!target) { console.log(t.key, "-> kein Tab offen"); continue; }
  const items = JSON.stringify(t.items);
  const titleFn = t.title;
  const EXPR = `(async () => {
    try {
      const r = await fetch(location.href, { credentials: "include" });
      const text = await r.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const out = [];
      doc.querySelectorAll(${items}).forEach((it) => {
        let title = ""; let url = "";
        ${titleFn}
        if (title && url) out.push({ title: title.slice(0, 60), url });
      });
      return JSON.stringify({ status: r.status, count: out.length, sample: out.slice(0, 3) });
    } catch (e) { return JSON.stringify({ status: "ERR", err: e.message }); }
  })()`;
  try {
    const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
    const sid = a.sessionId;
    await send("Runtime.enable", {}, sid);
    const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
    console.log(t.key, "->", res.result.value);
  } catch (e) {
    console.log(t.key, "-> attach err", e.message);
  }
}
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);