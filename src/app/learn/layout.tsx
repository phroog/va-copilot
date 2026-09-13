"use client";

import { AppShell } from "@/components/nav/app-nav";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}