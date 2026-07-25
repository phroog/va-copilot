import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { message } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Check credits
  const { ok, balance } = await checkCredits(user.id);
  if (!ok) {
    return NextResponse.json({ error: "Insufficient AI credits", balance, code: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  // Gather context
  const [recentEntries, upcomingFollowUps, recentPitches, academyProgress, mood, pet, completedMilestones] = await Promise.all([
    supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(5)
      .then(r => r.data ?? []),
    supabase
      .from("follow_ups")
      .select("*, jobs(title)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(5)
      .then(r => r.data ?? []),
    supabase
      .from("pitches")
      .select("status")
      .eq("user_id", user.id)
      .then(r => r.data ?? []),
    supabase
      .from("academy_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(r => r.data),
    supabase
      .from("moods")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(r => r.data),
    supabase
      .from("pets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(r => r.data),
    supabase
      .from("job_milestones")
      .select("*, jobs(title)")
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(r => r.data ?? []),
  ]);

  // Calculate pitch success rate
  const totalPitches = recentPitches.length;
  const wonPitches = recentPitches.filter((p: any) => p.status === "won").length;
  const pitchRate = totalPitches > 0 ? Math.round((wonPitches / totalPitches) * 100) : 0;

  const contextParts = [
    `User's recent time entries (last 5): ${recentEntries.map((e: any) =>
      `"${e.description || 'No description'}" for ${e.project_name || 'No project'} (${e.hourly_rate ? '$' + e.hourly_rate + '/hr' : 'no rate'})`
    ).join('; ') || 'No recent entries'}.`,
    `Upcoming follow-ups: ${upcomingFollowUps.map((f: any) =>
      `"${f.jobs?.title || 'Job'}" due ${f.due_date}`
    ).join('; ') || 'None'}.`,
    `Pitch stats: ${totalPitches} total, ${wonPitches} won (${pitchRate}% success rate).`,
    `Academy progress: ${academyProgress ? `Completed ${academyProgress.completed_lessons ?? 0} lessons, streak ${academyProgress.streak ?? 0}` : 'Not started'}.`,
    `Current mood: ${mood?.mood ?? 'Not recorded'}.`,
    `Pet status: ${pet?.name ? `Has pet "${pet.name}" (happiness: ${pet.happiness ?? 50}, hunger: ${pet.hunger ?? 50})` : 'No pet'}.`,
    `Recently completed milestones: ${completedMilestones.length > 0 ? completedMilestones.map((m: any) => `"${m.title}" for job "${m.jobs?.title || 'Unknown'}"`).join('; ') : 'None'}.`,
  ];

  const systemPrompt = `You are Mochi, a cute and helpful AI assistant for the Sari productivity platform. You speak in a kawaii, encouraging tone with occasional emojis. You help users manage their freelancing work.

Context about this user:
${contextParts.join('\n')}

You can:
- Summarize the user's week based on their time entries and activity
- Give productivity tips tailored to their workload
- Answer questions about how to use Sari features
- Help with freelancing best practices
- Celebrate wins and milestones with confetti vibes 🎉

Keep responses concise, warm, and helpful. Use the context above to personalize your answers. If asked to summarize the week, use the time entries data. If asked for a productivity tip, tailor it to their workload.

Important: Each message costs 1 credit. Be helpful but concise.`;

  try {
    const result = await callDeepSeek(user.id, message, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1024,
    });

    // Save to mochi chats
    await supabase.from("mochi_chats").insert({
      user_id: user.id,
      user_message: message,
      assistant_response: result.text,
    });

    return NextResponse.json({
      reply: result.text,
      balance: balance - 1,
    });
  } catch (err: any) {
    if (err.code === "INSUFFICIENT_CREDITS" || err.status === 402) {
      return NextResponse.json({ error: "Insufficient AI credits", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: err.message || "AI service error" }, { status: 500 });
  }
}
