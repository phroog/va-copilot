import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fallbackLesson } from "@/lib/learn/content";
import { getOrGenerateLevel } from "@/lib/learn/level-gen";
import type { LearnLevel, SkillNode, VaPath } from "@/lib/learn/types";

const MAX_CHUNK = 40;

function isUsableContent(c: unknown): boolean {
  return !!c && typeof c === "object" && Array.isArray((c as any).blocks) && (c as any).blocks.length > 0;
}

// Dev tool: pre-generate level content in chunks so nothing is ever generated
// lazily at play time. mode="offline" fills deterministic fallback lessons
// (instant, zero cost); mode="ai" uses DeepSeek (slower, costs platform AI).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "ai" ? "ai" : "offline";
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), MAX_CHUNK);
  const offset = Math.max(Number(body.offset) || 0, 0);

  const admin = createServiceRoleClient();

  const { count: totalNull } = await admin
    .from("learn_levels")
    .select("id", { count: "exact", head: true })
    .is("content", "null");
  const { count: totalLevels } = await admin.from("learn_levels").select("id", { count: "exact", head: true });

  const { data: levels, error } = await admin
    .from("learn_levels")
    .select("*")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let generated = 0;
  let skipped = 0;

  for (const level of (levels ?? []) as LearnLevel[]) {
    if (isUsableContent(level.content)) {
      skipped++;
      continue;
    }
    try {
      if (mode === "ai") {
        const { data: node } = await admin.from("skill_nodes").select("*").eq("id", level.node_id).maybeSingle();
        const { data: path } = node ? await admin.from("va_paths").select("*").eq("id", (node as SkillNode).path_id).maybeSingle() : { data: null };
        await getOrGenerateLevel(user.id, level, node as SkillNode, (path as VaPath) ?? null);
      } else {
        const fallback = fallbackLesson(level.title, level.subtitle, level.seed_key || level.id);
        await admin.from("learn_levels").update({ content: fallback, status: "ready", generated_at: new Date().toISOString() }).eq("id", level.id);
      }
      generated++;
    } catch (err) {
      console.warn(`[pregen] failed level ${level.id}:`, (err as Error).message);
    }
  }

  const nextOffset = offset + (levels?.length ?? 0);
  return NextResponse.json({
    mode,
    processed: levels?.length ?? 0,
    generated,
    skipped,
    nextOffset,
    totalNull: totalNull ?? 0,
    totalLevels: totalLevels ?? 0,
  });
}