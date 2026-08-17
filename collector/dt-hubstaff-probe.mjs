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

const list = await (await fetch(`${BASE}/json/list`)).json();
let target = list.find((t) => t.type === "page" && /hubstafftalent\.net/.test(t.url || ""));
if (!target) {
  const created = await send("Target.createTarget", { url: "https://hubstafftalent.net/search/jobs" });
  target = { id: created.targetId };
  console.log("created hubstaff tab:", created.targetId);
  await new Promise((r) => setTimeout(r, 9000));
} else {
  console.log("reusing tab:", target.url.slice(0, 70));
}

const a = await send("Target.attachToTarget", { targetId: target.id || target.targetId, flatten: true });
const sid = a.sessionId;
await send("Runtime.enable", {}, sid);

const EXPR = `(async () => {
  const bodyText = document.body ? document.body.innerText : "";
  const out = { url: location.href.slice(0, 90), bodyHead: bodyText.slice(0, 200) };
  const cardSels = {
    article: document.querySelectorAll('article').length,
    jobLink: document.querySelectorAll('a[href*="/job/"]').length,
    listing: document.querySelectorAll('.job-listing, [class*="job"]').length,
    title: document.querySelectorAll('h2 a, h3 a, [class*="title"] a').length,
  };
  out.cardSels = cardSels;
  const samples = Array.from(document.querySelectorAll('a[href*="/job/"], h2 a, h3 a'))
    .slice(0, 4).map((x) => ({ t: (x.textContent||'').trim().slice(0, 50), h: x.getAttribute('href') }));
  out.samples = samples;
  try {
    const r = await fetch(location.href, { credentials: "include" });
    const t = await r.text();
    out.fetchProbe = { status: r.status, bytes: t.length, jobLinks: (t.match(/\\/job\\//g)||[]).length };
  } catch (e) { out.fetchProbe = { status: "ERR", err: e.message }; }
  return JSON.stringify(out);
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);