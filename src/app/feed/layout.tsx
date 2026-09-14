"use client";

import { AppShell } from "@/components/nav/app-nav";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}