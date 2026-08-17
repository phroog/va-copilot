const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36", "accept": "text/html" };

const tests = [
  { name: "OnlineJobs", url: "https://www.onlinejobs.ph/jobseekers/job/administrative-assistant-1707807" },
  { name: "Guru", url: "https://www.guru.com/jobs/licensed-cpa-needed-for-attestation/2120152" },
  { name: "Hubstaff", url: "https://hubstafftalent.net/jobs/" },
  { name: "Freelancer", url: "https://www.freelancer.com/projects/data-entry/convert-case-series-cohort" },
];

(async () => {
  for (const t of tests) {
    try {
      const res = await fetch(t.url, { headers: UA });
      const html = await res.text();
      const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      let found = null;
      for (const block of ld) {
        try {
          const j = JSON.parse(block);
          const arr = Array.isArray(j) ? j : [j];
          for (const o of arr) {
            if (o && o["@type"] && String(o["@type"]).toLowerCase().includes("job")) {
              found = { type: o["@type"], title: o.title, descLen: (o.description || "").length };
              break;
            }
          }
        } catch {}
      }
      console.log(t.name, "| status", res.status, "| json-ld blocks:", ld.length, "| JobPosting:", found ? JSON.stringify(found) : "NEIN");
    } catch (e) { console.log(t.name, "ERR", e.message); }
  }
})().catch((e) => console.log("ERR", e.message));
