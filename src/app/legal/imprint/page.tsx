const COMPANY = {
  name: "Vascora OÜ",
  form: "OÜ (osaühing / private limited company)",
  registry: "17472482",
  vat: null as string | null,
  address: "Tornimäe tn 5, 10145 Tallinn, Harju maakond, Kesklinna linnaosa, Estonia",
  rep: "Julian Busarello",
  email: "hello@getsari.com",
};

export default function ImprintPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Impressum / Legal Notice</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Information pursuant to applicable Estonian law (Information Society Services Act) and, for
        users in Germany, the German Digital Services Act (DDG) / Teleservices Act.
      </p>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Service provider</h2>
      <table className="w-full text-sm mt-2 border-collapse">
        <tbody>
          <Row label="Company" value={COMPANY.name} />
          <Row label="Legal form" value={COMPANY.form} />
          <Row label="Registry code" value={COMPANY.registry} />
          {COMPANY.vat && <Row label="VAT ID" value={COMPANY.vat} />}
          <Row label="Registered office" value={COMPANY.address} />
          <Row label="Represented by" value={COMPANY.rep} />
          <Row label="Contact" value={COMPANY.email} />
        </tbody>
      </table>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Responsible for content</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {COMPANY.name}, {COMPANY.rep}, at the address above. Content published on this website is the
        responsibility of the operator in accordance with Section 18(2) of the Estonian Media Services Act
        (Meediateenuste seadus).
      </p>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Dispute resolution</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The European Commission provides a platform for online dispute resolution (ODR):{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-kawaii-purple underline">
          https://ec.europa.eu/consumers/odr
        </a>
        . We are neither obliged nor willing to participate in dispute resolution proceedings before a
        consumer arbitration board.
      </p>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Liability for content</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        As a service provider we are responsible for our own content on these pages in accordance with
        general laws. We are not obliged to monitor transmitted or stored third-party information or to
        investigate circumstances that indicate illegal activity.
      </p>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Liability for links</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Our service contains links to external websites (e.g. job boards such as Upwork, OnlineJobs.ph,
        Indeed). We have no influence over their content and therefore cannot assume any liability for
        these external contents. The respective provider or operator of the linked pages is always
        responsible for their content.
      </p>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Copyright</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The content and works created by the site operator on these pages are subject to copyright law.
        Duplication, processing, distribution, or any form of commercialization of such material beyond
        the scope of the copyright law requires prior written consent of the respective author.
      </p>

      <h2 className="text-xl font-bold mt-8 text-slate-800 dark:text-slate-100">Deutsch (Impressum)</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Angaben gemäß § 5 DDG. Diensteanbieter: {COMPANY.name}, {COMPANY.rep}, {COMPANY.address},
        Estland. Kontakt: {COMPANY.email}. Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:{" "}
        {COMPANY.name}, {COMPANY.rep}. Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-kawaii-purple underline">
          https://ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-kawaii-lavender/20 dark:border-dark-surface">
      <td className="py-2 pr-4 align-top font-semibold text-slate-500 dark:text-slate-400 w-40">{label}</td>
      <td className="py-2 text-slate-700 dark:text-slate-200">{value}</td>
    </tr>
  );
}