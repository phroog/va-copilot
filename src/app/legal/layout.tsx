import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-xl border-b border-sari-lavender/30 dark:border-dark-surface">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍠</span>
            <span className="text-xl font-extrabold bg-gradient-to-r from-sari-ube to-sari-coral bg-clip-text text-transparent">Sari</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs font-medium">
            <Link href="/legal/imprint" className="text-slate-500 dark:text-slate-400 hover:text-sari-ube">Imprint</Link>
            <Link href="/legal/terms" className="text-slate-500 dark:text-slate-400 hover:text-sari-ube">Terms</Link>
            <Link href="/legal/privacy" className="text-slate-500 dark:text-slate-400 hover:text-sari-ube">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>

      <footer className="border-t border-sari-lavender/30 dark:border-dark-surface bg-white/50 dark:bg-dark-bg/50">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-wrap gap-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-sari-ube">← Back to Sari</Link>
          <span>Vascora OÜ · Tornimäe tn 5, 10145 Tallinn, Estonia</span>
          <a href="mailto:hello@getsari.com" className="hover:text-sari-ube">hello@getsari.com</a>
        </div>
      </footer>
    </div>
  );
}