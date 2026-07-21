"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import quotes from "@/data/quotes.json";

function getDailyQuote() {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

export default function DailyMotivation() {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);

  useEffect(() => {
    setQuote(getDailyQuote());
  }, []);

  if (!quote) return null;

  return (
    <Card className="bg-gradient-to-r from-kawaii-peach/20 to-kawaii-lavender/20 dark:from-kawaii-peach/10 dark:to-kawaii-lavender/10 border-none shadow-sm">
      <CardContent className="p-4 text-center">
        <p className="text-lg mb-1">✨</p>
        <p className="text-sm italic text-slate-600 dark:text-slate-300 font-nunito">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-xs text-slate-400 mt-1">— {quote.author}</p>
      </CardContent>
    </Card>
  );
}
