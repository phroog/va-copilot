import Link from "next/link";

export const metadata = { title: "Terms of Service – Sari" };

export default function TermsPage() {
  return (
    <div className="max-w-none">
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Terms of Service</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <Section n={1} title="1. Who we are">
        <p>
          These Terms of Service (“Terms”) govern your use of the software and services provided by{" "}
          <b>Vascora OÜ</b>, Tornimäe tn 5, 10145 Tallinn, Estonia (“we”, “us”, “our”), operating the
          product <b>Sari</b> (a freelancing assistant, the “Service”). By creating an account or using
          the Service you agree to these Terms.
        </p>
      </Section>

      <Section n={2} title="2. The Service">
        <p>Sari provides, depending on your plan, features including but not limited to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>A live job feed aggregated from third-party job platforms.</li>
          <li>Profile matching and match scores for jobs.</li>
          <li>AI-assisted features (pitch generation, scam checks) using virtual credits.</li>
          <li>CV generation, invoice and finance tracking tools.</li>
          <li>Optional Telegram notifications and commands.</li>
        </ul>
        <p className="mt-2">
          The Service aggregates public information from third-party platforms. We do not own, control
          or guarantee those platforms, their availability, or the accuracy of their job listings.
        </p>
      </Section>

      <Section n={3} title="3. Accounts & eligibility">
        <p>
          You must be at least 18 years old and able to form a binding contract. You are responsible for
          keeping your login credentials secure and for all activity under your account. You may create
          one account; automated bulk account creation is not allowed.
        </p>
      </Section>

      <Section n={4} title="4. Credits">
        <p>
          AI features consume “credits” (a virtual unit). Credits have no monetary value, are not
          redeemable for cash, and are not transferable. Depending on your plan, credits are granted on
          a monthly basis and unused credits generally do not roll over unless stated otherwise. We may
          adjust credit pricing or grants with reasonable notice.
        </p>
      </Section>

      <Section n={5} title="5. Subscriptions & payments">
        <p>
          Paid plans (“Basic”, “Pro”) are billed on a recurring basis through our payment provider
          Stripe. By subscribing you authorise us to charge your chosen payment method. You can cancel
          anytime; cancellation takes effect at the end of the current billing period. Fees are not
          refunded for partial periods unless required by applicable law.
        </p>
        <p className="mt-2">
          <b>Right of withdrawal (EU consumers):</b> Under EU law you have a 14-day right of withdrawal
          for digital services. However, once you begin using the service (e.g. consuming credits,
          using AI features) during that period, you expressly agree to the immediate start of the
          service, and the right of withdrawal lapses once the service has been fully performed.
        </p>
        <p className="mt-2">
          Prices are shown in the currency selected at checkout and may include applicable taxes. If tax
          is due and not included in the price, it will be added at checkout.
        </p>
      </Section>

      <Section n={6} title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Use the Service to violate any law or the terms of third-party platforms (e.g. job boards).</li>
          <li>Scrape, harvest or systematically extract job data from our Service beyond normal use.</li>
          <li>Attempt to gain unauthorised access to other users' accounts or our systems.</li>
          <li>Reverse engineer, copy or resell the Service without our written consent.</li>
          <li>Upload content that is unlawful, infringing or harmful.</li>
        </ul>
      </Section>

      <Section n={7} title="7. AI outputs & scam checks – no guarantee">
        <p>
          AI-generated content (pitches, analyses, scam scores) is provided “as is” and is{" "}
          <b>not professional, legal or financial advice</b>. Scam scores and flags are heuristic
          indicators only and do not guarantee that a job or client is safe. You remain solely
          responsible for your decisions, communications and applications.
        </p>
      </Section>

      <Section n={8} title="8. Your content">
        <p>
          You retain ownership of the content you upload (profile data, CVs, job notes, invoices).
          You grant us a limited licence to store, process and display this content solely to provide
          the Service to you. We do not sell your personal data.
        </p>
      </Section>

      <Section n={9} title="9. Intellectual property">
        <p>
          Sari, its design, code, text, graphics and “look and feel” are owned by us or our licensors
          and are protected by applicable intellectual property law. Nothing in these Terms transfers
          any IP rights to you except the limited right to use the Service.
        </p>
      </Section>

      <Section n={10} title="10. Disclaimers & limitation of liability">
        <p>
          The Service is provided “as is” and “as available”, without warranties of any kind, express or
          implied, including merchantability or fitness for a particular purpose. To the maximum extent
          permitted by law, we are not liable for indirect, incidental or consequential damages, loss of
          profits, or loss of data. Our total aggregate liability arising out of or relating to the
          Service is limited to the amounts you actually paid to us in the twelve (12) months preceding
          the event giving rise to the claim. Nothing in these Terms excludes liability that cannot be
          excluded under applicable law.
        </p>
      </Section>

      <Section n={11} title="11. Termination">
        <p>
          You may delete your account at any time. We may suspend or terminate your account if you
          breach these Terms or if required by law. Upon termination, your access to the Service ends;
          your personal data is handled in accordance with our{" "}
          <Link href="/legal/privacy" className="text-kawaii-purple underline">Privacy Policy</Link>.
        </p>
      </Section>

      <Section n={12} title="12. Governing law & disputes">
        <p>
          These Terms are governed by the laws of the <b>Republic of Estonia</b>, excluding its conflict
          of laws rules. Disputes shall be submitted to the exclusive jurisdiction of the courts of
          Estonia, unless mandatory consumer law in your country of residence provides otherwise. The
          European Commission's online dispute resolution platform is available at{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-kawaii-purple underline">
            https://ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </Section>

      <Section n={13} title="13. Changes to these Terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes by
          email or in-app. Continued use of the Service after changes take effect constitutes
          acceptance of the updated Terms.
        </p>
      </Section>

      <Section n={14} title="14. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:hello.vascora@gmail.com" className="text-kawaii-purple underline">hello.vascora@gmail.com</a>
          {" "}or the address in the{" "}
          <Link href="/legal/imprint" className="text-kawaii-purple underline">Imprint</Link>.
        </p>
      </Section>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{children}</div>
    </section>
  );
}