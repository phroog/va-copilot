import fs from "fs";
const BASE = "http://127.0.0.1:9222";
const OUT = "C:/Users/Surface/AppData/Local/Temp/opencode";

const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url || ""));
if (!target) { console.log("no tab"); process.exit(1); }
console.log("TARGET:", target.url);

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

const HOOK = `
(function () {
  window.__cap = window.__cap || [];
  const orig = window.fetch;
  window.fetch = async function (...args) {
    let url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
    const init = args[1] || {};
    if (typeof url === "string" && /graphql/i.test(url)) {
      try {
        const resp = await orig.apply(this, args);
        const text = await resp.clone().text();
        window.__cap.push({ t: Date.now(), url, method: init.method || "GET", body: init.body || null, status: resp.status, resp: text.slice(0, 400000) });
        return resp;
      } catch (e) {
        window.__cap.push({ t: Date.now(), url, method: init.method || "GET", body: init.body || null, error: String(e) });
        throw e;
      }
    }
    return orig.apply(this, args);
  };
})()
`;
await send("Runtime.evaluate", { expression: HOOK }, sid);

const CLICK = `
(function () {
  // find a filter checkbox in the sidebar (job type / experience level etc.)
  const inputs = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
  const candidates = inputs.filter((i) => {
    const label = (i.closest("label") ? i.closest("label").innerText : "") + " " + (i.getAttribute("aria-label") || "");
    return /hourly|fixed|entry|intermediate|part/i.test(label) || i.offsetParent !== null;
  });
  if (!candidates.length) return "no checkbox found";
  const pick = candidates[0];
  pick.click();
  return "clicked: " + (pick.getAttribute("aria-label") || (pick.closest("label") ? pick.closest("label").innerText.slice(0, 60) : pick.className));
})()
`;
const clickRes = await send("Runtime.evaluate", { expression: CLICK, returnByValue: true }, sid);
console.log("FILTER CLICK:", clickRes.result.value);

await new Promise((r) => setTimeout(r, 12000));
const capRes = await send("Runtime.evaluate", { expression: "window.__cap", returnByValue: true }, sid);
const caps = capRes.result.value || [];
console.log(`captured ${caps.length} graphql calls`);
caps.forEach((c, i) => {
  console.log(`\n[${i}] ${c.method} ${c.url} | ${c.status || c.error} | ${(c.resp || "").length}b`);
  console.log("BODY:", c.body);
});
fs.writeFileSync(`${OUT}/gql_feed_calls.json`, JSON.stringify(caps, null, 2));
try { ws.close(); } catch {}
setTimeout(() => process.exit(0), 300);
