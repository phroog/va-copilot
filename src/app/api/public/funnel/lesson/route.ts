import { NextResponse } from "next/server";
import { funnelPersona, funnelQuestions } from "@/lib/learn/funnel";

// Public 3-question taste test for the dream funnel — no auth, deterministic.
export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title")?.trim() || "Virtual Assistant";
  return NextResponse.json({
    persona: funnelPersona(title),
    questions: funnelQuestions(title),
  });
}