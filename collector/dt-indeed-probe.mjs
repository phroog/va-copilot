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
let target = list.find((t) => t.type === "page" && /indeed\.com/.test(t.url || ""));
if (!target) {
  const created = await send("Target.createTarget", { url: "https://www.indeed.com/jobs?q=virtual%20assistant" });
  target = { id: created.targetId };
  console.log("created indeed tab:", created.targetId);
  await new Promise((r) => setTimeout(r, 8000));
}
console.log("target:", target.url || target.id);

const a = await send("Target.attachToTarget", { targetId: target.id || target.targetId, flatten: true });
const sid = a.sessionId;
await send("Runtime.enable", {}, sid);

const EXPR = `(async () => {
  const bodyText = document.body ? document.body.innerText : "";
  const challenged = /captcha|confirm you\\'re human|unusual traffic|verify you are human/i.test(bodyText.slice(0, 2000));
  const jobCards = {
    beacon: document.querySelectorAll('.job_seen_beacon').length,
    resultJob: document.querySelectorAll('.jobsearch-ResultJob').length,
    sliderItem: document.querySelectorAll('[data-testid="slider_item"]').length,
    jobTitle: document.querySelectorAll('a.jcs-JobTitle').length,
    dataJob: document.querySelectorAll('[data-jk]').length,
  };
  let fetchProbe = null;
  try {
    const r = await fetch(location.href, { credentials: "include" });
    const t = await r.text();
    fetchProbe = { status: r.status, bytes: t.length, hasSlider: /slider_item/.test(t), hasChallenge: /captcha|unusual traffic/i.test(t.slice(0, 3000)) };
  } catch (e) { fetchProbe = { status: "ERR", err: e.message }; }
  return JSON.stringify({
    url: location.href.slice(0, 80),
    challenged,
    bodyHead: bodyText.slice(0, 200),
    jobCards,
    fetchProbe,
  });
})()`;
const res = await send("Runtime.evaluate", { expression: EXPR, awaitPromise: true, returnByValue: true }, sid);
console.log(res.result.value);
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);