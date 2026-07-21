import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const polished = `${text}\n\nFurthermore, I believe that my proactive approach to communication and dedication to delivering high-quality work make me an ideal candidate for this role. I am always eager to go above and beyond to ensure client satisfaction.\n\nThank you for considering my application. I look forward to hearing from you soon.`;

  if (pitchId) {
    await supabase
      .from("pitches")
      .update({ polished_content: polished })
      .eq("id", pitchId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ polished });
}
