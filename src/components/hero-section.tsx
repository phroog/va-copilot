import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative px-4 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/30 dark:bg-dark-surface text-sm font-medium text-kawaii-purple dark:text-kawaii-lavender mb-6">
          🎉 Now in Beta — Free to use!
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
          Your{" "}
          <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
            AI Co-Pilot
          </span>{" "}
          for Freelancing
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Land more clients with AI-generated pitches, track your applications, and never miss a follow-up again.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/auth/signup">
            <Button variant="primary" size="lg">
              Start Free 🚀
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg">
              Watch Demo ▶️
            </Button>
          </Link>
        </div>
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-400 dark:text-slate-500">
          <span>✨ No credit card</span>
          <span>🛡️ Cancel anytime</span>
          <span>💬 AI-powered</span>
        </div>
      </div>
    </section>
  );
}
