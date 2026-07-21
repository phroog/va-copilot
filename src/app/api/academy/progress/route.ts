import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [progressRes, certRes] = await Promise.all([
    supabase
      .from("academy_progress")
      .select("masterclass_id, completed, quiz_score, completed_at")
      .eq("user_id", user.id),
    supabase
      .from("academy_certificates")
      .select("level, issued_at")
      .eq("user_id", user.id),
  ]);

  const totalRes = await supabase
    .from("academy_masterclasses")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    progress: progressRes.data ?? [],
    certificates: certRes.data ?? [],
    total_masterclasses: totalRes.count ?? 0,
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { masterclass_id, quiz_score } = await request.json();
  if (!masterclass_id) {
    return NextResponse.json({ error: "masterclass_id required" }, { status: 400 });
  }

  // Upsert progress
  const { error: upsertError } = await supabase.from("academy_progress").upsert(
    {
      user_id: user.id,
      masterclass_id,
      completed: true,
      quiz_score: quiz_score ?? null,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id, masterclass_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Check if level is complete -> issue certificate
  const { data: mc } = await supabase
    .from("academy_masterclasses")
    .select("level")
    .eq("id", masterclass_id)
    .single();

  if (mc) {
    const { data: allInLevel } = await supabase
      .from("academy_masterclasses")
      .select("id")
      .eq("level", mc.level);

    const { data: completedInLevel } = await supabase
      .from("academy_progress")
      .select("masterclass_id")
      .eq("user_id", user.id)
      .eq("completed", true)
      .in("masterclass_id", allInLevel?.map((m) => m.id) ?? []);

    if (allInLevel && completedInLevel && allInLevel.length === completedInLevel.length) {
      // Check if certificate already exists
      const { data: existingCert } = await supabase
        .from("academy_certificates")
        .select("id")
        .eq("user_id", user.id)
        .eq("level", mc.level)
        .single();

      if (!existingCert) {
        await supabase.from("academy_certificates").insert({
          user_id: user.id,
          level: mc.level,
          issued_at: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
