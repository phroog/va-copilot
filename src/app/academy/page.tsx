"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import Footer from "@/components/footer";

const benefits = [
  { emoji: "🎓", title: "Structured Curriculum", desc: "5 levels from Beginner to Business. Each masterclass is designed to build real-world skills." },
  { emoji: "💰", title: "100% Free — Forever", desc: "No hidden fees, no upsells. We believe in empowering VAs everywhere." },
  { emoji: "🏆", title: "Earn Certificates", desc: "Complete all masterclasses in a level to earn a digital certificate you can share." },
  { emoji: "💬", title: "Community Support", desc: "Join the global chat to discuss lessons, ask questions, and network with fellow VAs." },
];

const levels = [
  { emoji: "🌱", name: "Beginner", desc: "Start your VA journey. Learn the basics of finding clients, setting up services, and building your profile." },
  { emoji: "📈", name: "Intermediate", desc: "Sharpen your skills with proposals, client communication, and time management." },
  { emoji: "⚡", name: "Advanced", desc: "Master advanced tools, social media management, and Sari integration." },
  { emoji: "🚀", name: "Expert", desc: "Scale your business, build your brand, and automate your workflow." },
  { emoji: "💼", name: "Business", desc: "Hire a team, create passive income, and build a full VA agency." },
];

export default function AcademyLanding() {
  const { t } = useLocale();

  return (
    <div>
      {/* Hero */}
      <section className="px-4 pt-16 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-mint/30 text-sm font-medium text-green-700 dark:text-green-300 mb-6">
            🎉 {t("academyHeroBadge")}
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
            {t("academyHeroTitle")}{" "}
            <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              {t("academyHeroHighlight")}
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t("academyHeroSub")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/academy/signup">
              <Button variant="primary" size="lg">🎓 {t("startFreeAcademy")}</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">🍠 {t("trySariTool")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sub-nav */}
      <section className="px-4 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-white/60 dark:bg-dark-card/60 border border-kawaii-lavender/30 dark:border-dark-surface">
            <Link href="/" className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 squishy">
              🍠 Sari
            </Link>
            <div className="w-px h-6 bg-kawaii-lavender/30" />
            <Link href="/academy" className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white shadow-md squishy">
              🎓 Academy
            </Link>
            <div className="w-px h-6 bg-kawaii-lavender/30" />
            <Link href="/client" className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 squishy">
              🏢 For Clients
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((b) => (
            <Card key={b.title} className="squishy">
              <CardContent className="p-6 flex items-start gap-4">
                <span className="text-3xl shrink-0">{b.emoji}</span>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 mb-1">{b.title}</h3>
                  <p className="text-sm text-slate-500">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Curriculum preview */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-800 dark:text-slate-100 mb-8">
            📖 {t("academyCurriculum")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {levels.map((l) => (
              <Card key={l.name} className="text-center squishy">
                <CardContent className="p-5">
                  <div className="text-3xl mb-2">{l.emoji}</div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">{l.name}</h3>
                  <p className="text-xs text-slate-500">{l.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 text-center">
        <Card className="max-w-lg mx-auto bg-gradient-to-br from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5">
          <CardContent className="p-8">
            <p className="text-4xl mb-3">🎓</p>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-3">{t("academyCTA")}</h2>
            <p className="text-slate-500 mb-6">{t("academyCTADesc")}</p>
            <Link href="/academy/signup">
              <Button variant="primary" size="lg">{t("startFreeAcademy")} 🚀</Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
