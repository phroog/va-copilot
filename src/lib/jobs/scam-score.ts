/* ── Deterministic scam-risk estimate (no AI) ─────────────────────────
 * A rough 0-100 risk score derived from the job text + platform, shown as a
 * traffic light (green / yellow / orange / red). Not a verdict — a warning.
 */

export type ScamLevel = "green" | "yellow" | "orange" | "red";

export function scamScore(job: Record<string, any>): { risk: number; level: ScamLevel; flags: string[] } {
  const text = [job.title || "", job.description || "", (job.skills || []).join(" ")]
    .join(" ")
    .toLowerCase();
  const flags: string[] = [];
  let risk = 10;

  const bump = (pts: number, label: string) => {
    risk += pts;
    flags.push(label);
  };

  /* Payment red flags */
  if (/(processing|application|registration|activation|training|service|reimbursable) fee|pay to (register|apply)|deposit (to )?(secure|reserve)|payment.*(upfront|in advance)/i.test(text))
    bump(30, "Upfront fee requested");
  if (/western union|moneygram|wire transfer|gift card|paypal\s*(friends|family)|send (money|payment).*(first|upfront|now)|transfer.*(to.*)?(my|me) (bank|account)/i.test(text))
    bump(30, "Payment via bank transfer/gift card");
  if (/\b(credit card|card details|bank account (number|details)|ssn|social security|passport|id copy|driver'?s license copy)\b/i.test(text))
    bump(25, "Sensitive data requested");

  /* Off-platform contact */
  if (/(contact|reach|message) me (on|via|through|at)/i.test(text) && /telegram|whatsapp|signal|skype|discord|@gmail|@hotmail|@yahoo|@protonmail/i.test(text))
    bump(25, "Contact outside the platform");
  if (/\b(telegram|whatsapp)\b/i.test(text)) bump(12, "Telegram/WhatsApp mentioned");

  /* Too good / MLM / recruiting */
  if (/unlimited earning|guaranteed (income|salary|profit|earnings)|get rich|make \$?\d{2,3}[k,]?(\/?day)?|residual income|passive income|no experience (needed|required).*(high|big|\$)/i.test(text))
    bump(25, "Too good to be true");
  if (/recruiters? needed|referral (bonus|commission)|build (your|our) (own )?team|network marketing|multi[- ]level/i.test(text))
    bump(20, "MLM/Recruiting");

  /* Urgency + low barrier */
  if (/urgent|start (immediately|now|today)|no interview|hire (you )?(now|immediately|today)/i.test(text)) bump(10, "Urgency");
  if (/no experience (needed|required)|beginners welcome/i.test(text)) bump(8, "No experience required");

  /* Generic / unpaid trial */
  const descLen = (job.description || "").trim().length;
  if (descLen < 40) bump(15, "Very short/empty description");
  if (/(work|do|test|sample).*(free|without pay|for free)|unpaid (trial|test|task)/i.test(text))
    bump(25, "Unpaid test work");

  /* Very high budget with a vague description */
  const budget = String(job.budget || job.budget_amount || "");
  const m = budget.match(/\$?\s?(\d[\d,]*)/);
  if (m) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (v > 100000 && descLen < 300) bump(15, "Very high budget + vague description");
  }

  /* Platform factor: Reddit's forhire/slavelabour skew high-risk */
  const plat = String(job.platform || "").toLowerCase();
  if (plat.includes("reddit")) bump(15, "Platform: Reddit (higher scam rate)");

  /* Safe signals lower the risk */
  if (/(payment|payments?) (verified|protected)|escrow|verified payment/i.test(text)) risk = Math.max(0, risk - 12);

  risk = Math.min(100, Math.max(0, risk));
  const level: ScamLevel = risk >= 70 ? "red" : risk >= 50 ? "orange" : risk >= 30 ? "yellow" : "green";
  return { risk, level, flags };
}
