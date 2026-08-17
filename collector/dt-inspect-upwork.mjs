const BASE = "http://127.0.0.1:9222";
const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /per_page=50/.test(t.url || ""));
if (!target) target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url || ""));
console.log("TARGET:", target.url);

const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((r) => pending.set(mid, r));
}
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
const sid = a.result.sessionId;
const expr = `
(function () {
  const text = (document.body.innerText || "");
  const jobs = text.split("\\n").filter((l) => l.trim()).slice(0, 30);
  const res = {
    title: document.title,
    url: location.href,
    hasJustAMoment: text.includes("Just a moment"),
    hasFailedMsg: text.includes("Failed to load site message"),
    textHead: jobs.join(" | ").slice(0, 1500),
  };
  // look for likely job card containers
  const candidates = [];
  document.querySelectorAll("div").forEach((d) => {
    if (!d.children.length && d.textContent.trim().length > 20) return;
    const cls = (d.className && typeof d.className === "string") ? d.className : "";
    if (/job|tile|card|result/i.test(cls)) {
      if (d.querySelector("a[href*='jobs/']") || d.querySelector("h2, h3, h4")) {
        candidates.push({ cls: cls.slice(0, 80), tag: d.tagName, href: d.querySelector("a") ? d.querySelector("a").href : "" });
      }
    }
  });
  res.cardCandidates = candidates.slice(0, 6);
  const links = [];
  document.querySelectorAll("a[href*='/jobs/']").forEach((a) => {
    const t = a.textContent.trim();
    if (t && t.length > 10 && links.length < 5) links.push({ text: t.slice(0, 60), href: a.href.slice(0, 100) });
  });
  res.jobLinks = links;
  return JSON.stringify(res);
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sid);
console.log(res.result.result.value);
process.exit(0);
