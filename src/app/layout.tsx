import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/theme-provider";

export const metadata: Metadata = {
  title: "VA Copilot",
  description: "Your all-in-one freelancing companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg text-slate-800 dark:text-slate-100 antialiased">
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
