"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ButtonShowcase from "@/components/button-showcase";
import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import TrustBar from "@/components/trust-bar";
import ProblemSection from "@/components/problem-section";
import FeatureSection from "@/components/feature-section";
import HowItWorks from "@/components/how-it-works";
import PricingSection from "@/components/pricing-section";
import CTABanner from "@/components/cta-banner";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-10%]" />
        <div className="blob w-80 h-80 bg-kawaii-purple top-[30%] right-[-15%] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="blob w-72 h-72 bg-kawaii-peach bottom-[20%] left-[-10%] animate-blob" style={{ animationDelay: "4s" }} />
        <div className="blob w-64 h-64 bg-kawaii-lavender bottom-[-10%] right-[20%] animate-blob" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10">
        <Header />

        {/* Sub-navigation */}
        <section className="px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-white/60 dark:bg-dark-card/60 border border-kawaii-lavender/30 dark:border-dark-surface shadow-sm">
              <Link href="/" className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white shadow-md squishy">
                🛠️ VA Copilot
              </Link>
              <div className="w-px h-6 bg-kawaii-lavender/30" />
              <Link href="/academy" className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 squishy">
                🎓 Academy
              </Link>
              <div className="w-px h-6 bg-kawaii-lavender/30" />
              <Link href="/client" className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 squishy">
                🏢 For Clients
              </Link>
            </div>
          </div>
        </section>

        {/* Academy Hero */}
        <section className="px-4 pb-8 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-mint/30 text-sm font-medium text-green-700 dark:text-green-300 mb-6">
              🎉 100% Free — Start Today
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
              Become a World-Class{" "}
              <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
                Virtual Assistant
              </span>{" "}
              — Completely Free
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Master the art of virtual assistance with a structured curriculum, video masterclasses, and community support. No hidden fees. Ever.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/academy/signup">
                <Button variant="primary" size="lg">🎓 Start Free Academy</Button>
              </Link>
              <a href="#tool-features">
                <Button variant="outline" size="lg">🛠️ Try VA Copilot →</Button>
              </a>
            </div>
          </div>
        </section>

        {/* Tool Hero */}
        <section id="tool-features">
          <HeroSection />
        </section>

        <TrustBar />
        <ProblemSection />
        <FeatureSection />
        <HowItWorks />
        <PricingSection />
        <CTABanner />
        <Footer />
        <ButtonShowcase />
      </div>
    </main>
  );
}
