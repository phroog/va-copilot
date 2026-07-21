import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "Free",
    emoji: "🌱",
    features: ["5 AI pitches/month", "Basic dashboard", "Email support"],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    emoji: "⭐",
    popular: true,
    features: ["Unlimited AI pitches", "Pipeline board", "Priority support", "Smart follow-ups", "Virtual pet (Mochi!)"],
  },
  {
    name: "Enterprise",
    price: "$29",
    period: "/mo",
    emoji: "👑",
    features: ["Everything in Pro", "Team accounts", "API access", "Custom AI training", "Dedicated manager"],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            Simple Pricing 💎
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Start free, upgrade when you&apos;re ready
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? "border-kawaii-purple ring-2 ring-kawaii-purple/20 scale-105" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-xs font-bold">
                  Most Popular 🔥
                </div>
              )}
              <CardHeader className="text-center">
                <span className="text-4xl mb-2 block">{plan.emoji}</span>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{plan.price}</span>
                  {plan.period && <span className="text-slate-400">{plan.period}</span>}
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
              <CardFooter>
                <Link href="/auth/signup" className="w-full">
                  <Button variant={plan.popular ? "primary" : "outline"} className="w-full">
                    {plan.price === "Free" ? "Get Started 🚀" : `Choose ${plan.name}`}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
