"use client";

import { AppShell } from "@/components/nav/app-nav";

export default function BadgeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}