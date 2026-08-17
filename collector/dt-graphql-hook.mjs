import fs from "fs";
const BASE = "http://127.0.0.1:9222";
const OUT = "C:/Users/Surface/AppData/Local/Temp/opencode";
const KEY = "__gqlcap";

const list = await (await fetch(`${BASE}/json/list`)).json();
const ver = await (await fetch(`${BASE}/json/version`)).json();
let target = list.find((t) => t.type === "page" && /upwork\.com\/nx\/search\/jobs/.test(t.url || ""));
if (!target) { console.log("no tab"); process.exit(1); }
console.log("TARGET:", target.url);

const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
let sessId = null;
function send(method, params = {}, sid = null) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
  return new Promise((resolve) => pending.set(mid, (m) => resolve(m.result || m.error)));
}
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

const HOOK = `(() => {
  const key = "__gqlcap";
  const push = (e) => {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push(e);
      if (arr.length > 300) arr.shift();
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  };
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    let url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
    let init = args[1] || {};
    if (typeof url === "string" && /graphql/i.test(url)) {
      const t0 = Date.now();
      try {
        const resp = await origFetch.apply(this, args);
        const text = await resp.clone().text();
        push({ t: Date.now(), url, method: (init.method || "GET"), body: init.body || null, status: resp.status, resp: text.slice(0, 300000), ms: Date.now() - t0 });
        return resp;
      } catch (e) {
        push({ t: Date.now(), url, method: (init.method || "GET"), body: init.body || null, error: String(e) });
        throw e;
      }
    }
    return origFetch.apply(this, args);
  };
})();`;

const a = await send("Target.attachToTarget", { targetId: target.id, flatten: true });
sessId = a.sessionId;
await send("Runtime.enable", {}, sessId);
await send("Page.enable", {}, sessId);
await send("Page.addScriptToEvaluateOnNewDocument", { source: HOOK }, sessId);
console.log("hook installed on new documents; clearing old captures...");
await send("Runtime.evaluate", { expression: `try{localStorage.removeItem("${KEY}")}catch(e){}`, returnByValue: true }, sessId);

// reload the tab ourselves (the running collector reloads it too sometimes; hook persists)
await send("Page.reload", { ignoreCache: false }, sessId).catch(() => {});

let lastCount = 0;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const r = await send("Runtime.evaluate", {
    expression: `JSON.parse(localStorage.getItem("${KEY}") || "[]")`,
    returnByValue: true,
  }, sessId).catch(() => ({}));
  const arr = r && r.value ? r.value : [];
  if (arr.length !== lastCount) {
    lastCount = arr.length;
    console.log(`t+${(i + 1) * 4}s captured: ${arr.length}`);
    arr.forEach((e, ix) => console.log(`  [${ix}] ${e.method} ${e.url} | ${e.status || e.error || ""} | ${(e.resp || "").length}b | ${e.ms}ms`));
  }
}

const r2 = await send("Runtime.evaluate", {
  expression: `JSON.parse(localStorage.getItem("${KEY}") || "[]")`,
  returnByValue: true,
}, sessId).catch(() => ({}));
const entries = r2 && r2.value ? r2.value : [];
fs.writeFileSync(`${OUT}/gql_captured.json`, JSON.stringify(entries, null, 2));
console.log("\nsaved", entries.length, "entries to", OUT);
process.exit(0);
