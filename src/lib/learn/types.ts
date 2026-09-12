// Shared types for the Sari Learn engine (paths, skill tree, levels, progress).

export interface VaPath {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  emoji: string;
  color: string;
  order_index: number;
  is_active: boolean;
}

export interface SkillNode {
  id: string;
  path_id: string;
  parent_id: string | null;
  title: string;
  subtitle: string;
  emoji: string;
  depth: number;
  order_index: number;
  unlocks_tool: string | null;
  xp_reward: number;
}

export interface LearnLevel {
  id: string;
  node_id: string;
  title: string;
  subtitle: string;
  order_index: number;
  xp_reward: number;
  duration_minutes: number;
  content: LessonContent | null;
  status: "ready" | "generating" | "failed";
  seed_key: string | null;
}

export type NodeStatus = "locked" | "available" | "completed";

export interface NodeWithStatus extends SkillNode {
  status: NodeStatus;
  requiresPaid: boolean;
  progress: { stars: number; xp_earned: number; completed: boolean } | null;
  levels: LearnLevel[];
}

export interface PathWithNodes extends VaPath {
  nodes: NodeWithStatus[];
  completedNodes: number;
  totalNodes: number;
}

// ── Lesson content schema (rendered by the lesson player) ──
export type LessonBlock =
  | { type: "text"; heading: string; body: string }
  | { type: "tip"; text: string }
  | { type: "pick"; prompt: string; options: string[]; correct: number; explanation: string }
  | { type: "fill"; prompt: string; answers: string[]; explanation: string }
  | { type: "order"; prompt: string; items: string[]; explanation: string }
  | { type: "scenario"; prompt: string; options: string[]; correct: number; explanation: string }
  | { type: "reveal"; label: string; content: string };

export interface LessonContent {
  title: string;
  intro: string;
  blocks: LessonBlock[];
  takeaway: string;
}

export interface RankTier {
  title: string;
  emoji: string;
  min: number;
}

export interface UserProgressRow {
  level_id: string;
  node_id: string;
  status: string;
  stars: number;
  xp_earned: number;
  attempts: number;
  completed_at: string | null;
}
