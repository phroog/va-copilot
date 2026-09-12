// Leaderboard bots: deterministic daily drift so the ranks feel alive without
// any cron. Bot xp = base_xp + a small stable daily increment, seeded by bot
// id and day so it changes daily but never jumps around within a day.

export interface BotRow {
  id: string;
  name: string;
  avatar: string;
  base_xp: number;
  tier: number;
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Number of whole days since epoch.
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export function botXp(bot: BotRow): number {
  const day = dayIndex();
  const phase = hash(bot.id) % 7;
  // +0..60 xp/day, deterministic per bot, so they slowly climb.
  const drift = ((day + phase) * (7 + (hash(bot.id) % 23))) % 61;
  return bot.base_xp + drift;
}

export function botDisplay(bot: BotRow): { id: string; name: string; avatar: string; xp: number; isBot: true } {
  return { id: bot.id, name: bot.name, avatar: bot.avatar, xp: botXp(bot), isBot: true };
}
