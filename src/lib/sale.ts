/* Late Summer Sale + currency helpers. Peso rate is illustrative (~56 PHP/USD,
   realistic for the PH market). */

export const PESO_RATE = 56;

/* Sale ends N days from a fixed anchor so the countdown looks real but stable. */
export const SALE_END = new Date("2026-09-20T23:59:59Z");

export function daysLeft(): number {
  const diff = SALE_END.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function toPeso(usd: number): number {
  return Math.round(usd * PESO_RATE);
}

export function formatPeso(usd: number): string {
  return "₱" + toPeso(usd).toLocaleString("en-PH");
}

/* "This is roughly the price of …" — realistic local comparisons. */
export function coffeeCompare(usd: number): string {
  const peso = toPeso(usd);
  const coffees = Math.max(1, Math.round(peso / 140)); // ~₱140 for a decent coffee
  return coffees === 1 ? "about the price of 1 coffee" : `about the price of ${coffees} coffees`;
}