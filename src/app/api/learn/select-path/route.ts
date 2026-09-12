import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/learn/profile";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path_id } = await request.json().catch(() => ({}));
  if (!path_id) return NextResponse.json({ error: "path_id required" }, { status: 400 });

  const { data: path } = await supabase.from("va_paths").select("id").eq("id", path_id).maybeSingle();
  if (!path) return NextResponse.json({ error: "Path not found" }, { status: 404 });

  await ensureProfile(supabase, user.id);

  const { error } = await supabase.from("profiles").update({ active_path_id: path_id }).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, activePathId: path_id });
}
