// Each level gets a game structure (HTML model). The mode is derived
// deterministically from the level id so it's stable across reloads and
// different levels look/play differently.
export type LevelMode = "story" | "rapid" | "chat";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const MODES: LevelMode[] = ["story", "rapid", "chat"];

export function modeForLevel(id: string): LevelMode {
  return MODES[hash(id) % MODES.length];
}