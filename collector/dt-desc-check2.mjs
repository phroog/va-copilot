const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36", "accept": "text/html" };

(async () => {
  const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const oj = await (await fetch("https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=", { headers: UA })).text();
  const ojDesc = [...oj.matchAll(/class="desc"[^>]*>([\s\S]*?)<\//g)].map((m) => m[1]).filter((d) => d.trim());
  console.log("ONLINEJOBS: raw desc blocks:", ojDesc.length, "| lens:", ojDesc.map((d) => d.trim().length).slice(0, 4));
  ojDesc.slice(0, 2).forEach((d) => console.log("  ~", strip(d).slice(0, 90)));

  const gu = await (await fetch("https://www.guru.com/d/jobs/", { headers: UA })).text();
  const guDesc = [...gu.matchAll(/class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/g)].map((m) => strip(m[1])).filter(Boolean);
  console.log("GURU: description blocks:", guDesc.length, "| lens:", guDesc.map((d) => d.length).slice(0, 4));
  guDesc.slice(0, 2).forEach((d) => console.log("  ~", d.slice(0, 90)));

  const hs = await (await fetch("https://hubstafftalent.net/search/jobs", { headers: UA })).text();
  console.log("HUBSTAFF: html len:", hs.length, "| has description class:", /class="[^"]*description/.test(hs));
  const hsDesc = [...hs.matchAll(/class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => strip(m[1])).filter(Boolean);
  console.log("HUBSTAFF description blocks:", hsDesc.length, "| lens:", hsDesc.map((d) => d.length).slice(0, 3));
})().catch((e) => console.log("ERR", e.message));
