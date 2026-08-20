"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

export default function PricingSection() {
  const { t } = useLocale();
  const plans = [
    {
      name: t("planFreeName"),
      price: t("planFreePrice"),
      period: "",
      emoji: "🌱",
      popular: false,
      features: [t("planFreeFeature1"), t("planFreeFeature2"), t("planFreeFeature3"), t("planFreeFeature4")],
    },
    {
      name: t("planBasicName"),
      price: t("planBasicPrice"),
      period: "/mo",
      emoji: "⭐",
      popular: false,
      features: [t("planBasicFeature1"), t("planBasicFeature2"), t("planBasicFeature3"), t("planBasicFeature4")],
    },
    {
      name: t("planProName"),
      price: t("planProPrice"),
      period: "/mo",
      emoji: "👑",
      popular: true,
      features: [t("planProFeature1"), t("planProFeature2"), t("planProFeature3"), t("planProFeature4")],
    },
  ];

  return (
    <section id="pricing" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            {t("pricingTitle")} 💎
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            {t("pricingSub")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? "border-kawaii-purple ring-2 ring-kawaii-purple/20 scale-105" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-xs font-bold whitespace-nowrap">
                  {t("mostPopular")} 🔥
                </div>
              )}
              <CardHeader className="text-center">
                <span className="text-4xl mb-2 block">{plan.emoji}</span>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-kawaii-mint">✅</span> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Link href="/auth/signup" className="w-full">
                  <Button variant={plan.popular ? "primary" : "outline"} className="w-full">
                    {t("choosePlan")} {plan.name} →
                  </Button>
                </Link>
                <Link href="/pricing" className="text-xs text-kawaii-purple dark:text-kawaii-lavender underline text-center">
                  {t("pricingDetails")}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}