export default function TrustBar() {
  return (
    <section className="py-12 bg-kawaii-lavender/20 dark:bg-dark-surface/30">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
          Trusted by freelancers on
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 dark:text-slate-500">
          <span className="text-lg font-bold flex items-center gap-2">🔵 Upwork</span>
          <span className="text-lg font-bold flex items-center gap-2">🟢 Freelancer</span>
          <span className="text-lg font-bold flex items-center gap-2">🟡 Fiverr</span>
          <span className="text-lg font-bold flex items-center gap-2">🟣 Toptal</span>
          <span className="text-lg font-bold flex items-center gap-2">🔴 Guru</span>
        </div>
      </div>
    </section>
  );
}
