import Link from "next/link";
import Header from "@/components/header";
import TrustBar from "@/components/trust-bar";
import PricingSection from "@/components/pricing-section";
import LiveTicker from "@/components/live-ticker";
import Footer from "@/components/footer";

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

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="text-center px-4 pt-16 pb-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kawaii-purple/10 dark:bg-kawaii-purple/20 text-sm font-extrabold text-kawaii-purple dark:text-kawaii-lavender">
            🎮 Play to Get Hired™ — learn by playing, get scouted by real agencies
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold leading-[1.05] text-slate-900 dark:text-white">
            The golden ticket to your{" "}
            <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              work-from-home dream
            </span>
            .
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Learn real VA skills by playing missions. Build a live badge that proves them. Then get reviewed
            by our <b>partner agencies</b> — because we built the world's first{" "}
            <b className="text-kawaii-purple dark:text-kawaii-lavender">play-to-get-hired</b> model.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-lg shadow-xl shadow-kawaii-purple/30 hover:brightness-110 transition-all squishy"
            >
              🎮 Start playing free
            </Link>
            <a
              href="#how"
              className="px-8 py-4 rounded-2xl bg-white text-kawaii-purple border border-kawaii-purple/40 font-extrabold text-lg hover:bg-kawaii-lavender/20 transition-all squishy dark:bg-dark-card dark:text-kawaii-lavender dark:border-dark-surface"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            No subscriptions. No boring courses. Agencies scout top VAs — and if one hires you, your plan is refunded.
          </p>
        </section>

        {/* ── Stats strip ───────────────────────────────────────── */}
        <section className="px-4 pb-8">
          <div className="max-w-4xl mx-auto rounded-3xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 backdrop-blur px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              ["18", "skill paths"],
              ["3,600+", "skills to master"],
              ["2,100+", "VAs climbing the ranks"],
              ["🤝", "partner agencies scouting"],
            ].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{n}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Play to Get Hired ─────────────────────────────────── */}
        <section id="how" className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 dark:text-white">
              Play to Get Hired
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
              The world's first model that turns practice into a job — because your skills aren't on a CV,
              they're on a live badge that agencies actually review.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              {[
                { emoji: "🎮", title: "Play missions", desc: "Real VA skills, learned by doing — email, admin, socials, AI tools, client sims. No lectures, no quizzes that don't matter." },
                { emoji: "🏅", title: "Build your badge", desc: "Every sealed skill lands on a live, shareable badge with speed & accuracy tiers. Your proof of work, in your bio." },
                { emoji: "🔎", title: "Get scouted", desc: "Partner agencies review top VAs in the Scout Pool. Higher plan = higher visibility — and 100% money back if they pick you." },
              ].map((s) => (
                <div key={s.title} className="rounded-3xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-6 text-center hover:shadow-lg transition-shadow">
                  <span className="text-5xl">{s.emoji}</span>
                  <p className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">{s.title}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Education promise ─────────────────────────────────── */}
        <section className="px-4 py-12 bg-white/40 dark:bg-dark-card/40">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                An education that feels like a game
              </h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                Drop the 40-hour course. Here you train like you'd work — mission by mission, against a
                real client in the Client Sim, racing your own speed record. Every answer builds a skill,
                every skill builds your badge, every badge raises your scout chance.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "⚡ Daily energy & streaks — learn a little, every day",
                  "💬 Client Sim — answer real client messages like a pro",
                  "🥇 Bronze → Platinum speed & accuracy tiers",
                  "🏆 A live leaderboard of 2,100+ aspiring VAs",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-kawaii-purple">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-6 inline-block px-6 py-3 rounded-2xl bg-kawaii-purple text-white font-extrabold hover:brightness-110 transition-all squishy"
              >
                Start your first mission →
              </Link>
            </div>
            <div className="rounded-3xl border-2 border-dl-gold/40 bg-gradient-to-b from-[#2a2d3f] to-[#1f2233] p-6 shadow-[0_0_60px_rgba(255,200,0,0.12)]">
              <div className="flex justify-center -mt-3 mb-3">
                <div className="px-6 py-1.5 bg-dl-gold rounded-b-xl shadow-btn-gold">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#854c00]">Your badge · live</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl">👑</div>
                <p className="text-xl font-extrabold text-white">Your Name</p>
                <p className="text-[13px] text-white/60">VA Elite · Level 42</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {["✉️ Email", "🗓️ Admin", "📱 Social", "🤖 AI", "🌐 Ecom"].map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-dl-gold/15 border border-dl-gold/40 text-[10px] font-extrabold text-dl-gold">{s} ✓</span>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center justify-center my-5">
                <div className="w-28 h-28 rounded-full" style={{ background: "conic-gradient(#58cc02 82%, rgba(255,255,255,0.1) 0)" }} />
                <div className="absolute w-24 h-24 rounded-full bg-[#1f2233] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-white">82%</p>
                    <p className="text-[8px] font-extrabold uppercase tracking-wider text-white/40">mastered</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-dl-gold/10 border border-dl-gold/30 px-4 py-2.5 text-center">
                <p className="text-[11px] font-extrabold text-dl-gold">🏢 Top Scout Pool · 34% scout chance</p>
                <p className="text-[10px] text-white/50">Agencies are reviewing profiles right now.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Scout pool / guarantee ────────────────────────────── */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dl-gold/15 text-sm font-extrabold text-[#a57a00]">
              🤝 Partner agencies · Scout Pool
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
              Your skills are being watched
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We partner with real agencies that need trained VAs. They review profiles from our Scout Pool —
              so the better you play, the better your shot at getting hired. And if an agency scouts you,
              we refund <b>100% of your plan</b>. It's our way of proving this works.
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-4 text-left">
              {[
                { emoji: "🌱", t: "Free", d: "1 lesson a day. Train the basics — but stay invisible to agencies (0.5% scout chance).", cta: "Start free" },
                { emoji: "🌸", t: "BLOOM", d: "2 lessons + Client Sim, badge goes live, and you're in the Scout Pool (~12%).", cta: "Go BLOOM · $4.99" },
                { emoji: "👑", t: "Money Club", d: "Unlimited training, Top Scout Pool, verified badge — the front of the line (~34%).", cta: "Go Money Club · $9.99" },
              ].map((p) => (
                <div key={p.t} className="rounded-3xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-5">
                  <p className="text-3xl">{p.emoji}</p>
                  <p className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">{p.t}</p>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.d}</p>
                  <Link href="/pricing" className="mt-4 inline-block px-4 py-2 rounded-xl bg-kawaii-purple/10 text-kawaii-purple dark:text-kawaii-lavender text-sm font-extrabold border border-kawaii-purple/30 hover:bg-kawaii-lavender/20 transition-all squishy">
                    {p.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />
        <LiveTicker />

        {/* ── Golden ticket CTA ──────────────────────────────────── */}
        <section className="px-4 py-14">
          <div className="max-w-3xl mx-auto text-center rounded-3xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink p-10 shadow-2xl shadow-kawaii-purple/30">
            <div className="text-5xl mb-3">🎟️</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Your golden ticket is waiting</h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">
              The dream of working from home is one mission away. Play today — and let the agencies find you.
            </p>
            <Link
              href="/auth/signup"
              className="mt-6 inline-block px-10 py-4 rounded-2xl bg-white text-kawaii-purple font-extrabold text-lg shadow-lg hover:scale-[1.02] transition-all squishy"
            >
              Start playing free
            </Link>
          </div>
        </section>

        <TrustBar />
        <Footer />
      </div>
    </main>
  );
}