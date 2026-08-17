const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36", "accept": "text/html,application/json" };

async function check(url, name) {
  try {
    const res = await fetch(url, { headers: UA, redirect: "follow" });
    const html = await res.text();
    const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    let found = null;
    for (const block of ld) {
      try {
        const j = JSON.parse(block);
        for (const o of (Array.isArray(j) ? j : [j])) {
          if (o && /job/i.test(String(o["@type"] || ""))) { found = { type: o["@type"], descLen: (o.description || "").length }; break; }
        }
      } catch {}
      if (found) break;
    }
    const og = html.match(/property="og:description" content="([^"]*)"/i);
    console.log(name, "| status", res.status, "| json-ld:", ld.length, "| JobPosting:", found ? JSON.stringify(found) : "NEIN", "| og:desc:", og ? og[1].slice(0, 60) : "–");
  } catch (e) { console.log(name, "ERR", e.message); }
}

(async () => {
  // Freelancer: fresh project from API
  try {
    const api = await (await fetch("https://www.freelancer.com/api/projects/0.1/projects/active/?limit=1&full_description=true", { headers: UA })).json();
    const p = api.result.projects[0];
    await check("https://www.freelancer.com/projects/" + p.seo_url, "Freelancer");
  } catch (e) { console.log("Freelancer API ERR", e.message); }
  // OnlineJobs: fresh link from list
  try {
    const list = await (await fetch("https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=", { headers: UA })).text();
    const m = list.match(/href="(\/jobseekers\/job\/[^"]+)"/);
    if (m) await check("https://www.onlinejobs.ph" + m[1], "OnlineJobs");
  } catch (e) { console.log("OnlineJobs ERR", e.message); }
  // Hubstaff: fresh link from list
  try {
    const list = await (await fetch("https://hubstafftalent.net/search/jobs", { headers: UA })).text();
    const m = list.match(/href="(\/jobs\/[^"]+)"/);
    if (m) await check("https://hubstafftalent.net" + m[1], "Hubstaff");
  } catch (e) { console.log("Hubstaff ERR", e.message); }
  // Indeed: fresh jk link
  try {
    const list = await (await fetch("https://ph.indeed.com/jobs?q=&l=remote", { headers: UA })).text();
    const m = list.match(/href="(\/rc\/clk\?jk=[^"]+)"/);
    if (m) await check("https://ph.indeed.com" + m[1], "Indeed");
  } catch (e) { console.log("Indeed ERR", e.message); }
})().catch((e) => console.log("ERR", e.message));
