const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36", "accept": "application/json,text/html" };

(async () => {
  const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // RemoteOK public JSON API
  try {
    const r = await (await fetch("https://remoteok.com/api", { headers: UA })).json();
    const arr = Array.isArray(r) ? r : [];
    const sample = arr.find((j) => j && j.position && j.description);
    console.log("REMOTEOK: jobs:", arr.length, "| sample desc len:", sample ? strip(sample.description).length : 0);
    if (sample) console.log("  ~", strip(sample.description).slice(0, 90), "| url:", sample.url || sample.apply_url);
  } catch (e) { console.log("REMOTEOK ERR", e.message); }

  // Guru list: JSON-LD / embedded data?
  try {
    const gu = await (await fetch("https://www.guru.com/d/jobs/", { headers: UA })).text();
    const ld = [...gu.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    console.log("GURU json-ld blocks:", ld.length, ld.slice(0, 2).map((s) => s.length));
    const hasJobData = /"jobTitle"|"description"/.test(gu);
    console.log("GURU has jobTitle/description data:", hasJobData);
  } catch (e) { console.log("GURU ERR", e.message); }

  // Hubstaff list: embedded JSON?
  try {
    const hs = await (await fetch("https://hubstafftalent.net/search/jobs", { headers: UA })).text();
    const ld = [...hs.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    console.log("HUBSTAFF json-ld blocks:", ld.length, "| lens:", ld.map((s) => s.length).slice(0, 3));
    const m = hs.match(/window\.\w+\s*=\s*(\[[\s\S]{0,200})/);
    console.log("HUBSTAFF window data:", !!m);
  } catch (e) { console.log("HUBSTAFF ERR", e.message); }

  // OnlineJobs list: json-ld?
  try {
    const oj = await (await fetch("https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=", { headers: UA })).text();
    const ld = [...oj.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    console.log("ONLINEJOBS json-ld blocks:", ld.length, "| lens:", ld.map((s) => s.length).slice(0, 3));
  } catch (e) { console.log("ONLINEJOBS ERR", e.message); }
})().catch((e) => console.log("ERR", e.message));
