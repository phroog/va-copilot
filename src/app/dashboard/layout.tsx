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
import { Menu, X, LayoutDashboard, Briefcase, FileText, GitBranch, Settings, LogOut, Timer, DollarSign, Calendar, MessageCircle, Receipt, Shield, BookOpen, ChevronDown, ChevronRight, Coins, Users, Search, BarChart3, RadioTower, Fish, Dices, Flame, ShieldAlert } from "lucide-react";
import dynamic from "next/dynamic";
const MochiHub = dynamic(() => import("@/components/mochi-hub"), { ssr: false });
import { ToastProvider } from "@/components/toast";
import { FocusTimerProvider } from "@/components/focus-timer-provider";
import ClientErrorReporter from "@/components/client-error-reporter";

const sidebarGroups = [
  {
    labelKey: "workspace",
    defaultOpen: true,
    links: [
      { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/dashboard/jobs", labelKey: "jobs", icon: Briefcase },
      { href: "/dashboard/live-feed", labelKey: "liveFeed", icon: RadioTower },
      { href: "/dashboard/cv", labelKey: "cv", icon: FileText },
      { href: "/dashboard/milestones", labelKey: "milestones", icon: GitBranch },
      { href: "/dashboard/pipeline", labelKey: "pipeline", icon: GitBranch },
      { href: "/dashboard/vault", labelKey: "vault", icon: Shield },
      { href: "/academy/dashboard", labelKey: "academy", icon: BookOpen },
      { href: "/dashboard/clients", labelKey: "clients", icon: Users },
    ],
  },
  {
    labelKey: "tracking",
    defaultOpen: true,
    links: [
      { href: "/dashboard/time-tracker", labelKey: "timeTracker", icon: Timer },
      { href: "/dashboard/calendar", labelKey: "calendar", icon: Calendar },
      { href: "/dashboard/focus", labelKey: "focus", icon: Timer },
    ],
  },
  {
    labelKey: "finance",
    defaultOpen: false,
    links: [
      { href: "/dashboard/finances", labelKey: "finances", icon: DollarSign },
      { href: "/dashboard/invoices", labelKey: "invoices", icon: Receipt },
    ],
  },
  {
    labelKey: "community",
    defaultOpen: false,
    links: [
      { href: "/dashboard/chat", labelKey: "chat", icon: MessageCircle },
      { href: "/dashboard/aquarium", labelKey: "aquarium", icon: Fish },
    ],
  },
  {
    labelKey: "agency",
    defaultOpen: false,
    links: [
      { href: "/dashboard/agency", labelKey: "agency", icon: Shield },
      { href: "/dashboard/agency/reporting", labelKey: "agencyReporting", icon: BarChart3 },
    ],
  },
  {
    labelKey: "configuration",
    defaultOpen: false,
    links: [
      { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
      { href: "/dashboard/credits", labelKey: "credits", icon: Coins },
      { href: "/dashboard/wheel", labelKey: "wheel", icon: Dices },
      { href: "/dashboard/streak", labelKey: "streak", icon: Flame },
      { href: "/dashboard/scam-directory", labelKey: "scamDirectory", icon: ShieldAlert },
      { href: "/dashboard/scam-check", labelKey: "scamCheck", icon: Search },
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
    <div className="flex h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out bg-white/90 dark:bg-dark-card border-r border-kawaii-lavender/30 dark:border-dark-surface backdrop-blur-md lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-kawaii-lavender/30 dark:border-dark-surface">
            <div className="flex items-center justify-between">
              <Link href={userEmail ? "/dashboard" : "/"} className="flex items-center gap-2">
                <span className="text-2xl">🍠</span>
                <span className="text-xl font-extrabold bg-gradient-to-r from-sari-ube to-sari-coral bg-clip-text text-transparent">
                  Sari
                </span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarGroups.map((group) => {
              if (group.labelKey === "agency" && !agencyEnabled) return null;
              const isOpen = openGroups[group.labelKey];
              return (
                <div key={group.labelKey}>
                  <button
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group.labelKey]: !prev[group.labelKey] }))}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-2xl text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:bg-kawaii-lavender/10 dark:hover:bg-dark-surface/30 transition-all"
                  >
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {t(group.labelKey)}
                  </button>
                  {isOpen && (
                    <div className="ml-1 space-y-0.5 mt-0.5">
                      {group.links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all squishy ${
                              isActive
                                ? "bg-kawaii-lavender/40 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender"
                                : "text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 dark:hover:bg-dark-surface/50"
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

          <div className="p-4 border-t border-kawaii-lavender/30 dark:border-dark-surface">
            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-md border-b border-kawaii-lavender/30 dark:border-dark-surface">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block" />
              <div className="flex items-center gap-3">
                <LanguageDropdown />
                <ThemeToggle />
                <Link href="/dashboard/credits" className="flex items-center gap-1 px-2 py-1 rounded-xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 text-kawaii-purple dark:text-kawaii-lavender text-xs font-bold hover:bg-kawaii-lavender/30 transition-all">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{creditsBalance ?? "..."}</span>
                </Link>
                <div className="flex items-center gap-2 pl-3 border-l border-kawaii-lavender/30 dark:border-dark-surface">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white text-xs font-bold">
                  {(userName || userEmail)?.charAt(0).toUpperCase() ?? "U"}
                </div>
                {userName && (
                  <span className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                    {userName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 relative">
          <div className="blob w-72 h-72 bg-kawaii-pink top-[-5%] left-[-10%] -z-0" />
          <div className="blob w-64 h-64 bg-kawaii-lavender bottom-[-5%] right-[-10%] -z-0" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      <MochiHub />
      <ClientErrorReporter />
    </div>
    </ToastProvider>
    </FocusTimerProvider>
  );
}
