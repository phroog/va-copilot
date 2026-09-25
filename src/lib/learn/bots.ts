// Leaderboard bots: seeded bots drift deterministically day-by-day so their
// ranks shuffle, plus a rotating set of "newcomer" bots appears daily so the
// board always feels alive. No cron — everything is derived from the date.

export interface BotRow {
  id: string;
  name: string;
  avatar: string;
  base_xp: number;
  tier: number;
}

export interface BotDisplay {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isBot: true;
  isNew?: boolean;
}

const AVATARS = ["👑", "💎", "🚀", "🧲", "📈", "🌱", "🥔", "🐣"];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

// Seeded bots: daily climb + a periodic surge so rankings shuffle over time.
export function botXp(bot: BotRow): number {
  const day = dayIndex();
  const phase = hash(bot.id) % 11;
  const climb = ((day + phase) * (9 + (hash(bot.id) % 47))) % 173;
  const week = Math.floor(day / 7);
  const surge = (week + phase) % 5 === 0 ? (day * 13 + hash(bot.id)) % 420 : 0;
  return bot.base_xp + (climb + surge) * 50;
}

export function botDisplay(bot: BotRow): BotDisplay {
  return { id: bot.id, name: bot.name, avatar: bot.avatar, xp: botXp(bot), isBot: true };
}

// A rotating pool of realistic newcomer names.
const DAILY_POOL = [
  "Mara Jensen", "Ken Watanabe", "Livia Marchetti", "Tom Anderson", "Dalia Reyes", "Stefan Novak",
  "June Kim", "Alex Moreau", "Nadia Osei", "Peter Lindqvist", "Rosie Patel", "Emil Frank",
  "Camille Fournier", "Omar Farouk", "Grace Liu", "Matteo Rinaldi", "Ines Costa", "Theo Brandt",
  "Alicia Vega", "Mateusz Wisniewski", "Hana Yoshida", "Lars Johansen", "Maya Cohen", "Bruno Almeida",
  "Zoe Martin", "Erik Sandberg", "Fatima Zahra", "Jonas Keller", "Lena Fischer", "David Okafor",
];

// Newcomer bots that appear (and reshuffle) every day.
export function dailyNewBots(count = 12): BotDisplay[] {
  const day = dayIndex();
  const out: BotDisplay[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const idx = (day * 31 + i * 17 + hash("daily")) % DAILY_POOL.length;
    const name = DAILY_POOL[idx];
    if (used.has(name)) continue;
    used.add(name);
    out.push({
      id: `bot:daily:${day}:${name}`,
      name,
      avatar: AVATARS[(day + i) % AVATARS.length],
      xp: (60 + ((day * 23 + i * 97 + hash(name)) % 5400)) * 50,
      isBot: true,
      isNew: i < 2,
    });
  }
  return out;
}