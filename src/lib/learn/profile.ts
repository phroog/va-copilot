// Ensure a profiles row exists for the user (profiles is lazily created).
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export interface ProfileRow {
  id: string;
  user_id: string;
  public_id: string;
  inbox_email_alias: string | null;
  xp: number;
  active_path_id: string | null;
  streak_count: number;
  last_active_date: string | null;
  full_name: string;
}

export async function ensureProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, public_id, inbox_email_alias, xp, active_path_id, streak_count, last_active_date, full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data as ProfileRow;

  const alias = randomUUID().split("-")[0];
  const public_id = "user_" + randomUUID().split("-")[0].slice(0, 8);

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, full_name: "", desired_rate: "", bio: "", inbox_email_alias: alias, public_id })
    .select()
    .single();

  if (error) {
    // Race: another request just created it.
    const { data: retry } = await supabase
      .from("profiles")
      .select("id, user_id, public_id, inbox_email_alias, xp, active_path_id, streak_count, last_active_date, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    return (retry as ProfileRow) ?? null;
  }

  return created as ProfileRow;
}
