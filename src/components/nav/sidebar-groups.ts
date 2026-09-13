import {
  LayoutDashboard, Briefcase, FileText, GitBranch, Settings, Timer, DollarSign, Calendar, MessageCircle,
  Receipt, Shield, BookOpen, Coins, Users, Search, BarChart3, RadioTower, Fish, Dices, Flame, ShieldAlert, Send, Mic, Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolLink {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}
export interface ToolGroup {
  labelKey: string;
  emoji: string;
  descKey?: string;
  defaultOpen: boolean;
  links: ToolLink[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    labelKey: "home", emoji: "🏠", descKey: "homeDesc",
    defaultOpen: true,
    links: [{ href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard }],
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

export function isToolHref(href: string, pathname: string): boolean {
  return pathname === href;
}