import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; pitchId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { text, pitchId } = body;
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 10000) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.ok) {
    return NextResponse.json(
      { error: "Insufficient AI credits. You have 0 credits remaining." },
      { status: 402 }
    );
  }

  let polished: string;
  try {
    const result = await callDeepSeek(user.id, text, {
      systemPrompt: "Polish and improve the following freelance proposal text. Fix grammar, improve tone, make it more professional and compelling. Return only the polished text, no extra commentary.",
      temperature: 0.5,
      maxTokens: 2048,
    });
    polished = result.text;
  } catch (err: any) {
    if (err.status === 402) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json(
      { error: "AI polishing failed. Please try again later." },
      { status: 503 }
    );
  }

  if (pitchId) {
    await supabase
      .from("pitches")
      .update({ polished_content: polished })
      .eq("id", pitchId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ polished });
}
