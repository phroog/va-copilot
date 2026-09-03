import Link from "next/link";

export const metadata = { title: "Privacy Policy – Sari" };

export default function PrivacyPage() {
  return (
    <div className="max-w-none">
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Privacy Policy</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <Section title="1. Controller">
        <p>
          The controller of your personal data under the EU General Data Protection Regulation (GDPR)
          is <b>Vascora OÜ</b>, Tornimäe tn 5, 10145 Tallinn, Estonia, represented by Julian Busarello.
          Contact:{" "}
          <a href="mailto:hello@getsari.com" className="text-kawaii-purple underline">hello@getsari.com</a>.
        </p>
        <p className="mt-2">
          This policy also reflects applicable data protection laws in the countries we serve,
          including the Philippines <b>Data Privacy Act (RA 10173)</b>, Vietnam <b>Decree 13/2023/ND-CP</b>{" "}
          (PDPD) and Thailand <b>PDPA</b>. Where those laws require more, we follow the stricter rule.
        </p>
      </Section>

      <Section title="2. What data we process">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Account data:</b> email address, display name, password (hashed), avatar.</li>
          <li><b>Profile data:</b> skills, rates, categories, preferences, match vector.</li>
          <li><b>Usage data:</b> jobs viewed/saved/applied, credit usage, feature usage.</li>
          <li><b>Content you provide:</b> CVs, notes, invoices, time entries, finance records, chat messages.</li>
          <li><b>Optional integrations:</b> Telegram chat ID (if you connect Telegram), Google account (if you log in with Google).</li>
          <li><b>Payment data:</b> we do <b>not</b> store your card details. Payments are handled by Stripe.</li>
        </ul>
      </Section>

      <Section title="3. Why we process data (purposes & legal bases)">
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide and operate the Service (performance of the contract).</li>
          <li>Authenticate you and keep your account secure (contract; legitimate interest).</li>
          <li>Process payments and subscriptions (contract; legal obligation).</li>
          <li>Send service notifications and (with consent) Telegram push messages (contract; consent).</li>
          <li>Improve the Service through aggregated, non-personal statistics (legitimate interest).</li>
          <li>Comply with legal obligations (e.g. tax and accounting law) (legal obligation).</li>
        </ul>
      </Section>

      <Section title="4. Processors & third parties">
        <p className="mb-2">We share data only with processors needed to run the Service:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Supabase</b> – database, authentication, storage.</li>
          <li><b>Vercel</b> – application hosting.</li>
          <li><b>Stripe</b> – payment processing (their own privacy policy applies to payment data).</li>
          <li><b>Google</b> – optional sign-in (OAuth).</li>
          <li><b>DeepSeek</b> – AI features (pitch generation, scam analysis). Content you submit to AI features may be sent to DeepSeek for processing.</li>
          <li><b>Telegram</b> – notifications, if you opt in.</li>
        </ul>
        <p className="mt-2">
          Job listings shown in the Service come from public third-party platforms. We do not disclose
          your data to them.
        </p>
      </Section>

      <Section title="5. International transfers">
        <p>
          Your data may be processed outside the EEA (e.g. by AI and hosting providers). Where we
          transfer personal data outside the EEA, we rely on appropriate safeguards such as the EU
          Standard Contractual Clauses or adequacy decisions. For processors in the Philippines,
          Vietnam and Thailand, we rely on their local data protection obligations.
        </p>
      </Section>

      <Section title="6. Retention">
        <p>
          We keep your data only as long as needed for the purposes described, or as required by law
          (e.g. accounting records). If you delete your account, we delete or anonymise your personal
          data within a reasonable period, except where we must keep it for legal or tax reasons.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p className="mb-2">Depending on your location you may have the following rights:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right of access (GDPR Art. 15; PH RA 10173; TH PDPA; VN PDPD).</li>
          <li>Right to rectification (Art. 16).</li>
          <li>Right to erasure (“right to be forgotten”, Art. 17).</li>
          <li>Right to restriction of processing (Art. 18).</li>
          <li>Right to data portability (Art. 20).</li>
          <li>Right to object (Art. 21).</li>
          <li>Right to withdraw consent at any time (Art. 7).</li>
          <li>Right to lodge a complaint with a supervisory authority (in Estonia: the Andmekaitse Inspektsioon, <a href="https://www.aki.ee" target="_blank" rel="noopener noreferrer" className="text-kawaii-purple underline">aki.ee</a>).</li>
        </ul>
        <p className="mt-2">
          To exercise any right, email <a href="mailto:hello@getsari.com" className="text-kawaii-purple underline">hello@getsari.com</a>.
          We respond within the timeframe required by law (usually 30 days). We may ask you to verify
          your identity first.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use HTTPS, hashed passwords, Supabase Row Level Security and role-based access to protect
          your data. No method of transmission or storage is 100% secure; you use the Service at your
          own risk regarding risks beyond our control.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          The Service is not intended for minors under 18. We do not knowingly collect data from
          children. If you believe a child provided us data, contact us and we will delete it.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          We may update this policy. Material changes will be announced by email or in-app. The “last
          updated” date above reflects the current version.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Data protection enquiries:{" "}
          <a href="mailto:hello@getsari.com" className="text-kawaii-purple underline">hello@getsari.com</a>
          {" "}or Vascora OÜ, Tornimäe tn 5, 10145 Tallinn, Estonia.
        </p>
      </Section>

      {/* Cookies */}
      <div id="cookies" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Cookie Policy</h2>
        <Section title="A. What cookies we use">
          <p>
            Sari itself uses <b>only essential cookies and browser storage</b>. We do <b>not</b> use
            advertising or tracking cookies, and we do not sell or share data with data brokers.
          </p>
          <table className="w-full text-sm mt-3 border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-4">Name / storage</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Essential?</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-slate-300">
              <tr className="border-t border-kawaii-lavender/20 dark:border-dark-surface">
                <td className="py-2 pr-4">Supabase auth session (cookie)</td>
                <td className="py-2 pr-4">Keeps you logged in</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-t border-kawaii-lavender/20 dark:border-dark-surface">
                <td className="py-2 pr-4">localStorage: locale/theme</td>
                <td className="py-2 pr-4">Remembers language &amp; theme choice</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-t border-kawaii-lavender/20 dark:border-dark-surface">
                <td className="py-2 pr-4">localStorage: consent</td>
                <td className="py-2 pr-4">Remembers your cookie choice</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-t border-kawaii-lavender/20 dark:border-dark-surface">
                <td className="py-2 pr-4">Stripe (on checkout)</td>
                <td className="py-2 pr-4">Payment session (set by Stripe on their domain)</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-t border-kawaii-lavender/20 dark:border-dark-surface">
                <td className="py-2 pr-4">Google (sign-in)</td>
                <td className="py-2 pr-4">OAuth session (set by Google on their domain)</td>
                <td className="py-2">Yes</td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Section title="B. Consent">
          <p>
            Because all cookies we set are essential, we do not need to block them; we still show a
            consent banner to inform you and to confirm your choice. If we ever introduce non-essential
            cookies (e.g. analytics), we will require your consent before loading them.
          </p>
        </Section>
        <Section title="C. Managing cookies">
          <p>
            You can clear cookies and site data at any time in your browser settings. Clearing the auth
            cookie will log you out.
          </p>
        </Section>
      </div>

      <p className="mt-10 text-xs text-slate-400">
        See also our <Link href="/legal/imprint" className="underline">Imprint</Link> and{" "}
        <Link href="/legal/terms" className="underline">Terms of Service</Link>.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{children}</div>
    </section>
  );
}