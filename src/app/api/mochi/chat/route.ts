import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

const INTENT_MAP: Record<string, RegExp[]> = {
  jobs: [/job\b/i, /project\b/i, /client\b/i, /gig\b/i, /contract\b/i, /freelance/i, /hire/i, /hired/i, /proposal/i],
  invoices: [/invoice/i, /payment/i, /paid\b/i, /due\b/i, /bill/i, /outstanding/i, /overdue/i],
  finances: [/money/i, /earn/i, /income/i, /revenue/i, /profit/i, /finance/i, /budget/i, /made/i, /total\b/i],
  time: [/time\b/i, /track/i, /hour/i, /worked/i, /logged/i, /timesheet/i, /session/i],
  pitches: [/pitch/i, /win\b/i, /won\b/i, /success.rate/i, /conversion/i],
  followups: [/follow.up/i, /remind/i, /pending/i, /to.do/i, /followup/i],
  notes: [/note/i, /remember/i, /memo/i, /remind\b/i],
  milestones: [/milestone/i, /progress/i, /completed/i, /achieved/i, /done\b/i],
};

function detectIntents(text: string): string[] {
  const matched = new Set<string>();
  const lower = text.toLowerCase();
  if (lower.includes("week") || lower.includes("summary") || lower.includes("overview") || lower.includes("how am i") || lower.includes("status")) {
    return ["jobs", "invoices", "finances", "time", "pitches", "followups", "milestones"];
  }
  for (const [key, patterns] of Object.entries(INTENT_MAP)) {
    for (const re of patterns) {
      if (re.test(text)) { matched.add(key); break; }
    }
  }
  return Array.from(matched);
}

function buildContextBlock(label: string, data: any, formatter: (item: any) => string): string {
  if (!data || (Array.isArray(data) && data.length === 0)) return "";
  const items = Array.isArray(data) ? data.map(formatter).join("\n") : formatter(data);
  return `${label}:\n${items}\n`;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { message, history } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { ok, balance } = await checkCredits(user.id);
  if (!ok) {
    return NextResponse.json({ error: "Insufficient AI credits", balance, code: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  // Profile always included (tiny)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, desired_rate, bio, skills, experience_level, job_categories")
    .eq("id", user.id)
    .single();

  // Detect what data the user needs
  const intents = detectIntents(message);
  const contextSections: string[] = [];

  if (profile) {
    const parts: string[] = [];
    if (profile.full_name) parts.push(`Name: ${profile.full_name}`);
    if (profile.desired_rate) parts.push(`Desired rate: $${profile.desired_rate}/hr`);
    if (profile.skills?.length) parts.push(`Skills: ${profile.skills.join(", ")}`);
    if (profile.experience_level) parts.push(`Experience: ${profile.experience_level}`);
    if (profile.job_categories?.length) parts.push(`Categories: ${profile.job_categories.join(", ")}`);
    if (parts.length) contextSections.push(`--- Profile ---\n${parts.join("\n")}`);
  }

  // Fetch data for matched intents
  if (intents.includes("jobs")) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, platform, status, budget_amount, budget_type, posted_at")
      .eq("user_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(15);
    const block = buildContextBlock("--- Recent Jobs ---", jobs, (j) =>
      `- ${j.title} (${j.platform || "Unknown"}) [${j.status || "open"}]${j.budget_amount ? ` Budget: ${j.budget_amount}` : ""}`
    );
    if (block) contextSections.push(block);
  }

  if (intents.includes("invoices")) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, title, status, total_amount, due_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const block = buildContextBlock("--- Invoices ---", invoices, (i) =>
      `- ${i.title}: $${i.total_amount ?? 0} [${i.status}] ${i.due_date ? `due ${i.due_date}` : ""}`
    );
    if (block) contextSections.push(block);
  }

  if (intents.includes("finances")) {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data: monthIncome } = await supabase
      .from("income_log")
      .select("amount")
      .eq("user_id", user.id)
      .gte("earned_at", `${monthStr}-01`)
      .lte("earned_at", `${monthStr}-31`);
    const { data: yearIncome } = await supabase
      .from("income_log")
      .select("amount")
      .eq("user_id", user.id)
      .gte("earned_at", `${now.getFullYear()}-01-01`)
      .lte("earned_at", `${now.getFullYear()}-12-31`);
    const totalMonth = (monthIncome ?? []).reduce((s, r) => s + parseFloat(String(r.amount)), 0);
    const totalYear = (yearIncome ?? []).reduce((s, r) => s + parseFloat(String(r.amount)), 0);
    contextSections.push(`--- Finances ---\nThis month: $${totalMonth.toFixed(2)}\nThis year: $${totalYear.toFixed(2)}`);
  }

  if (intents.includes("time")) {
    const { data: entries } = await supabase
      .from("time_entries")
      .select("description, project_name, start_time, end_time, hourly_rate")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(10);
    const block = buildContextBlock("--- Recent Time Entries ---", entries, (e) =>
      `- "${e.description || "No description"}" for ${e.project_name || "No project"}${e.hourly_rate ? ` at $${e.hourly_rate}/hr` : ""} (${e.start_time?.substring(0, 10) || "?"})`
    );
    if (block) contextSections.push(block);
  }

  if (intents.includes("pitches")) {
    const { data: pitches } = await supabase
      .from("pitches")
      .select("status")
      .eq("user_id", user.id);
    const total = pitches?.length ?? 0;
    const won = (pitches ?? []).filter((p: any) => p.status === "won").length;
    const rate = total > 0 ? Math.round((won / total) * 100) : 0;
    contextSections.push(`--- Pitch Stats ---\n${total} total, ${won} won (${rate}% success rate)`);
  }

  if (intents.includes("followups")) {
    const { data: fups } = await supabase
      .from("follow_ups")
      .select("*, jobs(title)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(10);
    const block = buildContextBlock("--- Pending Follow-ups ---", fups, (f) =>
      `- "${f.jobs?.title || "Job"}" due ${f.due_date || "no date"}`
    );
    if (block) contextSections.push(block);
  }

  if (intents.includes("milestones")) {
    const { data: mstones } = await supabase
      .from("job_milestones")
      .select("*, jobs(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const block = buildContextBlock("--- Recent Milestones ---", mstones, (m) =>
      `- "${m.title}" for ${m.jobs?.title || "Unknown job"}`
    );
    if (block) contextSections.push(block);
  }

  // Build conversation history for DeepSeek
  const historyMessages: { role: string; content: string }[] = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      if (h.role === "user" || h.role === "ai") {
        historyMessages.push({ role: h.role === "ai" ? "assistant" : "user", content: h.text || "" });
      }
    }
  }

  const systemPrompt = `You are Mochi, an AI assistant built into Sari — a productivity platform for Virtual Assistants and freelancers. The user you're talking to is a VA who uses Sari to manage their freelance work.

Your role: Help them run their VA business more efficiently. You can answer questions about their data, give advice, and have friendly conversations.

Tone: Warm, encouraging, professional but friendly. Use occasional emojis. Keep responses concise.

About their data${contextSections.length > 0 ? "\n\n" + contextSections.join("\n\n") : "."}

You were asked: "${message}"
Respond conversationally based on the context provided (if any). If the question is general ("hello", "what can you do"), no context is needed — just chat normally. If you don't have enough data to answer well, say so and suggest what the user could check in their Sari dashboard.`;

  try {
    const result = await callDeepSeek(user.id, message, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    });

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
