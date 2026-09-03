"use client";

import Header from "@/components/header";
import ImpactHero from "@/components/impact-hero";
import TrustBar from "@/components/trust-bar";
import CaseStudy from "@/components/case-study";
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
        <ImpactHero />
        <TrustBar />
        <CaseStudy />
        <FeatureSection />
        <HowItWorks />
        <PricingSection />
        <CTABanner />
        <Footer />
      </div>
    </main>
  );
}