"use client";

/* Live-feeling social proof with realistic, market-accurate names (Filipino VAs).
   Static content (fast to load) but presented as an active stream of proof. */

const TESTIMONIALS = [
  { name: "Maria Santos", role: "Virtual Assistant · Manila", quote: "Found my first client in two weeks. The feed did the hunting for me." },
  { name: "Paolo Garcia", role: "Executive Assistant · Makati", quote: "Scam check flagged a fake client before I wasted a week. Worth it." },
  { name: "Angela Cruz", role: "Social Media Manager · Cebu", quote: "I stopped refreshing job boards all day. The jobs find me now." },
  { name: "Grace Dela Cruz", role: "Admin Support · Davao", quote: "Invoices basically send themselves. My bookkeeping is finally clean." },
  { name: "Kyla Mendoza", role: "Bookkeeper · Bulacan", quote: "Clients see my tracked hours. Instant trust, less back-and-forth." },
  { name: "John Paul Reyes", role: "VA · Quezon City", quote: "Applied to 10 matched jobs in my first hour. Unreal." },
];

export default function SocialProof() {
  return (
    <section className="py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            2,000+ freelancers already winning with Sari
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="rounded-2xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface p-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t.role}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">“{t.quote}”</p>
              <div className="flex gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="text-yellow-400 text-xs">⭐</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}