import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function extractWithDeepSeek(text: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { error: "DEEPSEEK_API_KEY is not configured. Please add it to your .env.local file." };
  }

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "Extract the following job details from the provided text: title, platform, description, budget. Return a valid JSON object with these keys. If a field cannot be found, set it to null. Only output the JSON object, nothing else.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: `DeepSeek API error (${res.status}): ${errText}` };
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim());
    return {
      data: {
        title: parsed.title ?? null,
        platform: parsed.platform ?? null,
        description: parsed.description ?? null,
        budget: parsed.budget ?? null,
      },
    };
  } catch {
    return { data: { title: null, platform: null, description: text.slice(0, 1000), budget: null } };
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const files = [
      ...formData.getAll("screenshot"),
      ...formData.getAll("screenshots"),
    ].filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No screenshot file provided" }, { status: 400 });
    }

    const Tesseract = require("tesseract.js");
    const ocrTexts: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        const { data: ocrData } = await Tesseract.recognize(buffer, "eng");
        const text = (ocrData.text ?? "").trim();
        if (text) ocrTexts.push(text);
      } catch {
        // skip a broken image, keep the rest
      }
    }

    const extractedText = ocrTexts.join("\n\n");
    if (!extractedText.trim()) {
      return NextResponse.json({ error: "Could not extract any text from the images. Please try clearer screenshots." }, { status: 400 });
    }

    const result = await extractWithDeepSeek(extractedText);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data, screenshots: files.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to process screenshots" }, { status: 500 });
  }
}
