"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useLocale } from "@/lib/i18n/context";
import { useProfileName } from "@/lib/use-profile-name";
import { useState, useEffect } from "react";
import { Menu, X, LayoutDashboard, Briefcase, FileText, GitBranch, Settings, LogOut, Timer, DollarSign, Calendar, MessageCircle, Receipt, Shield, BookOpen, ChevronDown, ChevronRight, Coins, Users, Search, BarChart3, RadioTower, Fish, Dices, Flame, ShieldAlert, Send, Mic, Inbox, Mail } from "lucide-react";
import dynamic from "next/dynamic";
const MochiHub = dynamic(() => import("@/components/mochi-hub"), { ssr: false });
import UpgradeNudge from "@/components/upgrade-nudge";
import FirstRunTour from "@/components/first-run-tour";
import { ToastProvider } from "@/components/toast";
import { FocusTimerProvider } from "@/components/focus-timer-provider";
import ClientErrorReporter from "@/components/client-error-reporter";

const sidebarGroups = [
  {
    labelKey: "home", emoji: "🏠", descKey: "homeDesc",
    defaultOpen: true,
    links: [
      { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    ],
  },
  {
    labelKey: "money", emoji: "💰", descKey: "moneyDesc",
    defaultOpen: true,
    links: [
      { href: "/dashboard/live-feed", labelKey: "liveFeed", icon: RadioTower },
      { href: "/dashboard/jobs", labelKey: "jobs", icon: Briefcase },
      { href: "/dashboard/cv", labelKey: "cv", icon: FileText },
      { href: "/dashboard/pipeline", labelKey: "pipeline", icon: GitBranch },
      { href: "/dashboard/applications", labelKey: "applications", icon: Send },
      { href: "/dashboard/milestones", labelKey: "milestones", icon: GitBranch },
    ],
  },
  {
    labelKey: "safe", emoji: "🛡️", descKey: "safeDesc",
    defaultOpen: true,
    links: [
      { href: "/dashboard/scam-check", labelKey: "scamCheck", icon: Search },
      { href: "/dashboard/scam-directory", labelKey: "scamDirectory", icon: ShieldAlert },
    ],
  },
  {
    labelKey: "time", emoji: "⏱️", descKey: "timeDesc",
    defaultOpen: true,
    links: [
      { href: "/dashboard/time-tracker", labelKey: "timeTracker", icon: Timer },
      { href: "/dashboard/calendar", labelKey: "calendar", icon: Calendar },
      { href: "/dashboard/focus", labelKey: "focus", icon: Timer },
    ],
  },
  {
    labelKey: "cash", emoji: "💸", descKey: "cashDesc",
    defaultOpen: false,
    links: [
      { href: "/dashboard/finances", labelKey: "finances", icon: DollarSign },
      { href: "/dashboard/invoices", labelKey: "invoices", icon: Receipt },
    ],
  },
  {
    labelKey: "connect", emoji: "🤝", descKey: "connectDesc",
    defaultOpen: false,
    links: [
      { href: "/dashboard/clients", labelKey: "clients", icon: Users },
      { href: "/dashboard/chat", labelKey: "chat", icon: MessageCircle },
      { href: "/dashboard/vault", labelKey: "vault", icon: Shield },
      { href: "/dashboard/aquarium", labelKey: "aquarium", icon: Fish },
      { href: "/dashboard/support", labelKey: "support", icon: Mail },
    ],
  },
  {
    labelKey: "grow", emoji: "🎓", descKey: "growDesc",
    defaultOpen: false,
    links: [
      { href: "/dashboard/interview", labelKey: "interview", icon: Mic },
      { href: "/learn", labelKey: "academy", icon: BookOpen },
    ],
  },
  {
    labelKey: "agency", emoji: "🏢", descKey: "agencyDesc",
    defaultOpen: false,
    links: [
      { href: "/dashboard/agency", labelKey: "agency", icon: Shield },
      { href: "/dashboard/agency/reporting", labelKey: "agencyReporting", icon: BarChart3 },
    ],
  },
  {
    labelKey: "setup", emoji: "⚙️", descKey: "setupDesc",
    defaultOpen: false,
    links: [
      { href: "/dashboard/setup", labelKey: "setupGuide", icon: Settings },
      { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
      { href: "/dashboard/credits", labelKey: "credits", icon: Coins },
      { href: "/dashboard/streak", labelKey: "streak", icon: Flame },
      { href: "/dashboard/wheel", labelKey: "wheel", icon: Dices },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { name: userName } = useProfileName();
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [agencyEnabled, setAgencyEnabled] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved: Record<string, boolean> = {};
    sidebarGroups.forEach((g) => { saved[g.labelKey] = g.defaultOpen; });
    return saved;
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email ?? null);
    });
    fetch("/api/ai/credits").then(async r => { if (r.ok) { const d = await r.json(); setCreditsBalance(d.balance); } }).catch(() => {});
    fetch("/api/user-settings").then(async r => { if (r.ok) { const d = await r.json(); setAgencyEnabled(d.settings?.agency_enabled === true); } }).catch(() => {});
  }, [supabase]);

  const handleLogout = async () => {
    try {
      window.sessionStorage.removeItem("sari_welcome_done");
    } catch {}
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <FocusTimerProvider>
    <ToastProvider>
    <div className="dark flex h-screen text-white" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #131628 100%)" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out bg-[#1f2233] border-r border-white/5 backdrop-blur-md lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center justify-between">
              <Link href={userEmail ? "/dashboard" : "/"} className="flex items-center gap-2">
                <span className="text-2xl">🍠</span>
                <span className="text-xl font-extrabold text-white">Sari</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Learn = the main hub */}
          <div className="px-4 pt-4">
            <Link
              href="/learn"
              onClick={() => setSidebarOpen(false)}
              className="block rounded-2xl bg-gradient-to-r from-dl-purple to-[#ff8ba7] p-3.5 text-white shadow-btn-purple hover:brightness-105 transition-all squishy"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold leading-tight">Learn</p>
                  <p className="text-[10px] opacity-80">Skill tree & missions</p>
                </div>
                <span className="text-lg">→</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarGroups.map((group) => {
              if (group.labelKey === "agency" && !agencyEnabled) return null;
              const isOpen = openGroups[group.labelKey];
              return (
                <div key={group.labelKey}>
                  <button
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group.labelKey]: !prev[group.labelKey] }))}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-2xl text-xs font-bold text-white/40 uppercase tracking-wider hover:bg-white/5 transition-all"
                  >
                    <span className="text-base leading-none">{group.emoji}</span>
                    <span className="flex-1 text-left">{t(group.labelKey)}</span>
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {group.descKey && (
                    <p className="px-3 pb-1 -mt-0.5 text-[10px] text-white/30 not-uppercase">{t(group.descKey)}</p>
                  )}
                  {isOpen && (
                    <div className="ml-1 space-y-0.5 mt-0.5">
                      {group.links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all squishy ${
                              isActive
                                ? "bg-dl-purple text-white shadow-btn-purple"
                                : "text-white/60 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <link.icon className="w-4 h-4" />
                            <span className="flex-1">{t(link.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-dl-red hover:bg-white/5" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-[#131628]/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/60">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm font-bold text-white/60">
              <span>🧰 Tools</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageDropdown />
              <ThemeToggle />
              <Link href="/dashboard/credits" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1f2233] border border-white/10 text-white font-bold text-sm hover:border-dl-blue transition-colors">
                <span className="text-[16px]">💎</span>
                <span>{creditsBalance ?? "…"}</span>
              </Link>
              <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dl-purple to-[#ff8ba7] flex items-center justify-center text-white text-xs font-extrabold">
                  {(userName || userEmail)?.charAt(0).toUpperCase() ?? "U"}
                </div>
                {userName && (
                  <span className="hidden sm:block text-sm font-bold text-white/80 truncate max-w-[150px]">
                    {userName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 relative">
          <div className="blob w-72 h-72 bg-dl-purple top-[-5%] left-[-10%] -z-0 opacity-10" />
          <div className="blob w-64 h-64 bg-[#ff8ba7] bottom-[-5%] right-[-10%] -z-0 opacity-10" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      <MochiHub />
      <UpgradeNudge />
      <FirstRunTour />
      <ClientErrorReporter />
    </div>
    </ToastProvider>
    </FocusTimerProvider>
  );
}