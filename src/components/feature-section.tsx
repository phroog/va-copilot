"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

export default function FeatureSection() {
  const { t } = useLocale();
  const features = [
    { emoji: "📡", title: t("featureFeedTitle"), description: t("featureFeedDesc") },
    { emoji: "🎯", title: t("featureMatchTitle"), description: t("featureMatchDesc") },
    { emoji: "🚀", title: t("featurePitchTitle"), description: t("featurePitchDesc") },
    { emoji: "🛡️", title: t("featureScamTitle"), description: t("featureScamDesc") },
    { emoji: "🔄", title: t("featureSwapTitle"), description: t("featureSwapDesc") },
    { emoji: "🎡", title: t("featureWheelTitle"), description: t("featureWheelDesc") },
    { emoji: "💾", title: t("featureCvTitle"), description: t("featureCvDesc") },
    { emoji: "💰", title: t("featureFinanceTitle"), description: t("featureFinanceDesc") },
  ];
  return (
    <section id="features" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            {t("featuresTitle")} 🎯
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            {t("featuresSub")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="hover:border-kawaii-purple/50 transition-all">
              <CardHeader>
                <span className="text-3xl mb-2 block">{f.emoji}</span>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription className="text-sm">{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}