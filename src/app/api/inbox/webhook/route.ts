import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = (formData.get("from") as string) ?? "";
    const subject = (formData.get("subject") as string) ?? "";
    const text = (formData.get("text") as string) ?? "";
    const to = (formData.get("to") as string) ?? "";

    if (!to) {
      return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });
    }

    // Extract user alias from the "to" address
    // Format: user+{alias}@parse.va-copilot.com
    const match = to.match(/user\+([a-f0-9-]+)@/i);
    const alias = match ? match[1] : null;
    if (!alias) {
      return NextResponse.json({ error: "Could not extract user from email" }, { status: 400 });
    }

    // Look up user by inbox_email_alias
    const supabase = createClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("inbox_email_alias", alias)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "User not found for this alias" }, { status: 404 });
    }

    const userId = profiles[0].user_id;

    // Determine platform from subject or from address
    const fromLower = from.toLowerCase();
    const subjectLower = subject.toLowerCase();
    let platform = "";
    if (fromLower.includes("upwork") || subjectLower.includes("upwork")) platform = "Upwork";
    else if (fromLower.includes("onlinejobs") || subjectLower.includes("onlinejobs")) platform = "OnlineJobs.ph";
    else if (fromLower.includes("fiverr") || subjectLower.includes("fiverr")) platform = "Fiverr";
    else if (fromLower.includes("freelancer") || subjectLower.includes("freelancer")) platform = "Freelancer";
    else if (fromLower.includes("facebook") || subjectLower.includes("facebook")) platform = "Facebook";
    else if (fromLower.includes("linkedin") || subjectLower.includes("linkedin")) platform = "LinkedIn";

    const { error } = await supabase
      .from("inbox_messages")
      .insert({
        user_id: userId,
        from_address: from,
        subject,
        body: text,
        platform,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
