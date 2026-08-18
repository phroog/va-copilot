export const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "CAD", "AUD", "INR", "JPY"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PHP: "₱",
  CAD: "CA$",
  AUD: "A$",
  INR: "₹",
  JPY: "¥",
};

/* Approximate static rates to USD (EUR base for EU freelancers). Update when
   rates drift; good enough for freelance bookkeeping. */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  PHP: 0.017,
  CAD: 0.73,
  AUD: 0.65,
  INR: 0.012,
  JPY: 0.0067,
};

export function normalizeCurrency(code: string | null | undefined): string {
  const c = (code || "USD").toUpperCase();
  return CURRENCIES.includes(c as any) ? c : "USD";
}

export function rateToUSD(code: string): number {
  return RATES_TO_USD[normalizeCurrency(code)] ?? 1;
}

export function convert(amount: number, from: string, to: string): number {
  const f = normalizeCurrency(from);
  const t = normalizeCurrency(to);
  if (f === t) return amount;
  const usd = amount * rateToUSD(f);
  return usd / rateToUSD(t);
}

export function formatMoney(amount: number, currency: string): string {
  const code = normalizeCurrency(currency);
  const symbol = CURRENCY_SYMBOLS[code] ?? code + " ";
  const value = Math.round(amount * 100) / 100;
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* Detect a currency code/symbol from a raw budget string like "$1,000" or
   "PHP 5,000" or "₱3,500". Returns null when ambiguous. */
export function detectCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  const patterns: [string, RegExp][] = [
    ["PHP", /PHP|₱|PH PESO|PHILIPPINE/i],
    ["USD", /USD|\$(?!0)/i],
    ["EUR", /EUR|€/i],
    ["GBP", /GBP|£/i],
    ["CAD", /CAD|C\$|CANADIAN/i],
    ["AUD", /AUD|A\$|AUSTRALIAN/i],
    ["INR", /INR|₹|RS\.?/i],
    ["JPY", /JPY|¥/i],
  ];
  for (const [code, re] of patterns) {
    if (re.test(s)) return code;
  }
  return null;
}