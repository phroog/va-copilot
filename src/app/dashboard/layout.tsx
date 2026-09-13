"use client";

import { AppShell } from "@/components/nav/app-nav";
import dynamic from "next/dynamic";
const MochiHub = dynamic(() => import("@/components/mochi-hub"), { ssr: false });
import UpgradeNudge from "@/components/upgrade-nudge";
import FirstRunTour from "@/components/first-run-tour";
import { ToastProvider } from "@/components/toast";
import { FocusTimerProvider } from "@/components/focus-timer-provider";
import ClientErrorReporter from "@/components/client-error-reporter";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FocusTimerProvider>
      <ToastProvider>
        <AppShell>
          {children}
          <MochiHub />
          <UpgradeNudge />
          <FirstRunTour />
          <ClientErrorReporter />
        </AppShell>
      </ToastProvider>
    </FocusTimerProvider>
  );
}