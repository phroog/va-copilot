// Server helper: ensure a user has a unique skill tree per path, lazily
// generating + storing it the first time it's needed.
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTree, type TreeEntry } from "./tree-gen";
import type { SkillNode, VaPath } from "./types";

export async function ensureUserTrees(
  supabase: SupabaseClient,
  userId: string,
  paths: VaPath[],
  allNodes: SkillNode[]
): Promise<Map<string, TreeEntry[]>> {
  const map = new Map<string, TreeEntry[]>();
  const existing = new Set<string>();

  const { data: rows } = await supabase
    .from("user_skill_trees")
    .select("path_id, tree")
    .eq("user_id", userId);

  for (const r of rows ?? []) {
    if (Array.isArray(r.tree) && r.tree.length) {
      map.set(r.path_id, r.tree as TreeEntry[]);
      existing.add(r.path_id);
    }
  }

  for (const path of paths) {
    if (existing.has(path.id)) continue;
    const pathNodes = allNodes.filter((n) => n.path_id === path.id);
    if (pathNodes.length === 0) continue;
    const seed = `${userId}:${path.id}`;
    const tree = generateTree(pathNodes, seed);
    map.set(path.id, tree);
    await supabase
      .from("user_skill_trees")
      .upsert({ user_id: userId, path_id: path.id, tree, seed }, { onConflict: "user_id,path_id", ignoreDuplicates: true });
  }

  return map;
}

// Get (and generate if missing) the tree for one path.
export async function getUserTree(
  supabase: SupabaseClient,
  userId: string,
  path: VaPath,
  allNodes: SkillNode[]
): Promise<TreeEntry[]> {
  const map = await ensureUserTrees(supabase, userId, [path], allNodes);
  return map.get(path.id) ?? [];
}