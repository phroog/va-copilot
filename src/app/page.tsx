import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";

const TOOLS = [
  ["📡", "Live job feed", "Best matches from 10+ platforms"],
  ["🤖", "AI pitch writer", "Pitches in one click"],
  ["🛡️", "Scam checker", "Risk-score any client"],
  ["⏱️", "Time tracker", "Prove your hours"],
  ["📅", "Calendar & inbox", "Client ops on autopilot"],
  ["🗂️", "CRM & systems", "Organized like a pro"],
  ["💬", "Client sim", "Train on real scenarios"],
  ["💰", "Invoicing", "Payments that chase themselves"],
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-10%]" />
        <div className="blob w-80 h-80 bg-kawaii-purple top-[30%] right-[-15%] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="blob w-72 h-72 bg-kawaii-peach bottom-[20%] left-[-10%] animate-blob" style={{ animationDelay: "4s" }} />
        <div className="blob w-64 h-64 bg-kawaii-lavender bottom-[-10%] right-[20%] animate-blob" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10">
        <Header />

        {/* ── HERO — the punch ─────────────────────────────────── */}
        <section className="text-center px-4 pt-14 pb-10 max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black text-white text-sm font-extrabold">
            🎮 PLAY TO GET HIRED — do you have what it takes?
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-black leading-[1.02] text-slate-900 dark:text-white">
            We own the agencies.
            <br />
            <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              You own the skills.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Sari isn't a course. It's a <b className="text-slate-900 dark:text-white">pipeline</b>. You play
            missions, we rank you against 2,100+ VAs — and <b className="text-slate-900 dark:text-white">our own
            agencies</b> scout the best profiles off the leaderboard. No CV-hunting. No 40-hour videos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dream"
              className="px-9 py-4 rounded-2xl bg-black text-white font-black text-lg hover:scale-[1.03] active:scale-[0.98] transition-all squishy shadow-xl"
            >
              🎮 Start your dream
            </Link>
            <a
              href="#deal"
              className="px-9 py-4 rounded-2xl bg-white text-slate-900 border-2 border-black font-black text-lg hover:bg-black hover:text-white transition-all squishy dark:bg-dark-card dark:text-white dark:border-dark-surface"
            >
              See the deal →
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
            <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-dark-card/70 border border-kawaii-lavender/40">☕ Less than a coffee to get scouted</span>
            <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-dark-card/70 border border-kawaii-lavender/40">💸 Scouted by us → 100% money back</span>
            <span className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-dark-card/70 border border-kawaii-lavender/40">🔥 2,100+ VAs fighting for the top</span>
          </div>
        </section>

        {/* ── THE DEAL — own agencies ──────────────────────────── */}
        <section id="deal" className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-slate-900 dark:text-white">
              We're not a platform. We're the employer pipeline.
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
              Most apps teach you a skill and wave goodbye. We built <b>our own VA agencies</b> — and our
              recruiters literally pull from the Sari leaderboard. The higher you climb, the harder it is to ignore you.
            </p>

            {/* diagram */}
            <div className="mt-10 grid sm:grid-cols-4 gap-3 items-stretch">
              {[
                { emoji: "🎮", t: "You play", d: "Train on real missions & client sims" },
                { emoji: "🏅", t: "We rank you", d: "Live badge + leaderboard of 2,100+" },
                { emoji: "🏢", t: "Our agencies scout", d: "Recruiters review top profiles" },
                { emoji: "💼", t: "You get hired", d: "Or we refund 100% of your plan" },
              ].map((s, i) => (
                <div key={s.t} className="relative">
                  <div className="h-full rounded-3xl border-2 border-black dark:border-dark-surface bg-white dark:bg-dark-card p-5 text-center">
                    <span className="text-4xl">{s.emoji}</span>
                    <p className="mt-2 font-black text-slate-900 dark:text-white">{s.t}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.d}</p>
                  </div>
                  {i < 3 && (
                    <span className="hidden sm:flex absolute top-1/2 -right-4 -translate-y-1/2 text-2xl text-slate-400 z-10">→</span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 italic">
              Real talk: nobody can guarantee a job. But we made it so your skills are staring agencies in the face.
            </p>
          </div>
        </section>

        {/* ── PLAY TO GET HIRED steps ──────────────────────────── */}
        <section className="px-4 py-12 bg-black dark:bg-dark-card/80 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-extrabold">
              🎮 THE MODEL
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black">Play to Get Hired™</h2>
            <p className="mt-2 text-white/70 max-w-2xl mx-auto">
              The world's first model that turns practice into a job. Your skills aren't on a CV — they're on a
              live badge our recruiters actually open.
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-3 text-left">
              {[
                { n: "01", emoji: "🎮", t: "Play missions", d: "Email, admin, socials, AI tools — learned by doing, with speed & accuracy tiers." },
                { n: "02", emoji: "🏅", t: "Build your badge", d: "Every sealed skill lands on a shareable badge. Put it in your bio. Watch agencies click." },
                { n: "03", emoji: "🔎", t: "Get scouted", d: "Our own agencies review the Scout Pool. Higher plan = higher visibility. Money back if you're hired." },
              ].map((s) => (
                <div key={s.n} className="rounded-3xl bg-white/10 border border-white/15 p-6">
                  <span className="text-5xl">{s.emoji}</span>
                  <p className="mt-3 text-2xl font-black">{s.n} · {s.t}</p>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TOOLS ────────────────────────────────────────────── */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-slate-900 dark:text-white">
              All the tools you'll ever need. One tab.
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
              You're not here to learn software — you're here to get hired. But while you're at it, the whole
              VA stack ships with Sari.
            </p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TOOLS.map(([emoji, t, d]) => (
                <div key={t} className="rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card p-4 hover:shadow-lg transition-shadow">
                  <span className="text-2xl">{emoji}</span>
                  <p className="mt-1.5 font-extrabold text-slate-900 dark:text-white text-sm">{t}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING — prepaid + scout chance ─────────────────── */}
        <section className="px-4 py-12 bg-white/50 dark:bg-dark-card/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-slate-900 dark:text-white">
              Pick your lane
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mt-2">
              Prepaid like a SIM. No subscriptions, no auto-renewal — top up and train.
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {[
                { emoji: "🌱", t: "Free", price: "$0", per: "", scout: 0.5, vis: 1, hint: "Invisible to agencies", feats: ["1 lesson a day", "Tools access", "Watch the leaderboard"], cta: "Start free", dark: false },
                { emoji: "🌸", t: "BLOOM", price: "$4.99", per: " / 30 days", scout: 12, vis: 3, hint: "In the Scout Pool", feats: ["2 lessons a day", "Client Sim (5/day)", "Badge goes live", "Ranked on the board"], cta: "Top up · BLOOM", dark: false },
                { emoji: "👑", t: "Money Club", price: "$9.99", per: " / 30 days", scout: 34, vis: 4, hint: "Front of the line", feats: ["Unlimited lessons", "Unlimited Client Sim", "Top Scout Pool", "✓ Verified badge", "1:1 support"], cta: "Top up · Money Club", dark: true },
              ].map((p) => (
                <div key={p.t} className={`rounded-3xl p-6 ${p.dark ? "bg-black text-white" : "border-2 border-black dark:border-dark-surface bg-white dark:bg-dark-card"}`}>
                  <p className="text-3xl">{p.emoji}</p>
                  <p className={`mt-2 text-xl font-black ${p.dark ? "text-white" : "text-slate-900 dark:text-white"}`}>{p.t}</p>
                  <p className={`mt-1 text-3xl font-black ${p.dark ? "text-white" : "text-slate-900 dark:text-white"}`}>
                    {p.price}<span className="text-sm font-bold opacity-70">{p.per}</span>
                  </p>
                  <ul className={`mt-4 space-y-1.5 text-sm ${p.dark ? "text-white/80" : "text-slate-600 dark:text-slate-300"}`}>
                    {p.feats.map((f) => (
                      <li key={f} className="flex items-start gap-1.5"><span className="text-kawaii-pink">✓</span>{f}</li>
                    ))}
                  </ul>
                  {/* scout chance */}
                  <div className={`mt-4 rounded-xl p-2.5 ${p.dark ? "bg-white/10" : "bg-kawaii-purple/10"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">Scout chance</p>
                      <span className="text-sm font-black tabular-nums">{p.scout}%</span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= p.vis ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink" : "opacity-20 bg-slate-400"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] opacity-60 mt-1">{p.hint}</p>
                  </div>
                  <Link
                    href="/pricing"
                    className={`mt-5 block text-center py-3 rounded-2xl font-black text-sm transition-all squishy ${
                      p.dark ? "bg-white text-black hover:bg-kawaii-pink" : "bg-black text-white hover:bg-kawaii-purple"
                    }`}
                  >
                    {p.cta} →
                  </Link>
                </div>
              ))}
            </div>

            {/* guarantee */}
            <div className="mt-6 rounded-2xl border-2 border-kawaii-mint/60 dark:border-green-700/50 bg-green-50/80 dark:bg-green-900/10 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">🤝</span>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">
                  Scouted by one of our agencies? 100% of your money back.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  We own the agencies. If one of them picks you up, your prepaid plan is refunded in full. No forms, no games.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────── */}
        <section className="px-4 py-14">
          <div className="max-w-3xl mx-auto text-center rounded-3xl bg-black text-white p-10 shadow-2xl">
            <div className="text-5xl mb-3">🎟️</div>
            <h2 className="text-3xl sm:text-4xl font-black">Your future clients are already looking.</h2>
            <p className="mt-3 text-white/75 max-w-xl mx-auto">
              The work-from-home dream is one mission away. Play today — and let our agencies find you.
            </p>
            <Link
              href="/auth/signup"
              className="mt-6 inline-block px-10 py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black text-lg shadow-xl hover:scale-[1.03] transition-all squishy"
            >
              🎮 Start playing free
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}