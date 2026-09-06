/* Loose, provocative upgrade nudges — rotated so the corner widget and paywall
   reminders don't always show the same line. */

export const UPGRADE_SLOGANS: string[] = [
  "Why waste time? Start earning money.",
  "Why wait? Unlock more jobs from $4.99.",
  "Still scrolling? The winners already upgraded.",
  "Your rent won't pay itself. Unlock more jobs.",
  "Broke is a choice. Unlock unlimited jobs.",
  "The best jobs go to paid members first.",
  "Time is money — stop losing both.",
  "Dream bigger. It costs less than a coffee a day.",
  "Fortune favors the one who upgraded.",
  "Stop dreaming. Start earning.",
  "Gatekeeping your own income is wild.",
  "One more day on the free plan = one more day waiting.",
  "Nothing changes if nothing changes. Upgrade.",
  "The market doesn't wait for free users.",
];

/* Deterministic-but-shifting pick so different placeholders show different
   lines, and they change over time without a rerender loop. */
export function sloganAt(index: number): string {
  return UPGRADE_SLOGANS[((index % UPGRADE_SLOGANS.length) + UPGRADE_SLOGANS.length) % UPGRADE_SLOGANS.length];
}

export function randomSlogan(): string {
  return UPGRADE_SLOGANS[Math.floor(Math.random() * UPGRADE_SLOGANS.length)];
}
