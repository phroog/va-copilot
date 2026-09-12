// Server-only level generation: on first play a level's content is generated
// by DeepSeek (cheap) and cached in learn_levels.content. If the AI is
// unavailable, a deterministic static fallback is stored instead so the level
// is always playable with zero cost and never fails twice.
import { callDeepSeek } from "@/lib/ai-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseLessonContent, fallbackLesson, CONTENT_SYSTEM_PROMPT } from "./content";
import type { LessonContent, LearnLevel, SkillNode, VaPath } from "./types";

function isUsableContent(c: unknown): c is LessonContent {
  return !!c && typeof c === "object" && Array.isArray((c as any).blocks) && (c as any).blocks.length > 0;
}

function buildPrompt(path: VaPath | null, node: SkillNode, level: LearnLevel): string {
  const context = path
    ? `Career path: ${path.emoji} ${path.title} — ${path.subtitle}.`
    : "";
  const lessonNumber = level.order_index;
  return `${context}
Skill: ${node.emoji} ${node.title} — ${node.subtitle}.
Mission ${lessonNumber}: "${level.title}".

Create ONE interactive micro-lesson that teaches a complete beginner this skill so they can actually use it for a client today.`;
}

export async function getOrGenerateLevel(
  userId: string,
  level: LearnLevel,
  node: SkillNode,
  path: VaPath | null
): Promise<LessonContent> {
  // 1. Cache hit
  if (isUsableContent(level.content)) return level.content;

  // Writes (caching generated content) bypass RLS via the service role.
  const admin = createServiceRoleClient();

  // 2. Try AI generation
  try {
    const result = await callDeepSeek(userId, buildPrompt(path, node, level), {
      systemPrompt: CONTENT_SYSTEM_PROMPT,
      temperature: 0.8,
      maxTokens: 1400,
      free: true, // platform absorbs content-gen cost; not a user AI feature
    });

    const parsed = parseLessonContent(result.text);
    if (parsed) {
      await admin
        .from("learn_levels")
        .update({ content: parsed, status: "ready", generated_at: new Date().toISOString() })
        .eq("id", level.id);
      return parsed;
    }
  } catch (err) {
    console.warn(`[learn] AI generation failed for level ${level.id}:`, (err as Error).message);
  }

  // 3. Static fallback (deterministic, cached)
  const fallback = fallbackLesson(level.title, level.subtitle, level.seed_key || level.id);
  await admin
    .from("learn_levels")
    .update({ content: fallback, status: "ready", generated_at: new Date().toISOString() })
    .eq("id", level.id);
  return fallback;
}
