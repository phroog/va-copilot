import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTABanner() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5 rounded-3xl p-12 border border-kawaii-lavender/30 dark:border-dark-surface">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
          Ready to Land Your Next Gig? 🚀
        </h2>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Join thousands of freelancers who are winning more clients with Sari.
        </p>
        <div className="mt-8">
          <Link href="/auth/signup">
            <Button variant="primary" size="lg">
              Start Free Today ✨
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">No credit card required. 14-day free trial.</p>
      </div>
    </section>
  );
}
