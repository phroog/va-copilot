"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

const features = [
  "pricing.feature1",
  "pricing.feature2",
  "pricing.feature3",
  "pricing.feature4",
  "pricing.feature5",
  "pricing.feature6",
];

export function PricingBox() {
  const { t } = useLocale();

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl dark:text-white">
            {t("pricing.title")}
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-md">
          <Card className="border-blue-200 shadow-lg dark:border-blue-800">
            <CardContent className="p-8">
              <div className="text-center">
                <span className="text-5xl font-bold text-slate-900 dark:text-white">
                  {t("pricing.price")}
                </span>
                <span className="text-lg text-slate-500 dark:text-slate-400">
                  {t("pricing.perMonth")}
                </span>
              </div>
              <ul className="mt-8 space-y-3">
                {features.map((key) => (
                  <li key={key} className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{t(key)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button variant="primary" size="lg" className="mt-8 w-full">
                  {t("pricing.cta")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
