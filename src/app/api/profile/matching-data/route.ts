import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("skills, desired_rate, experience_level, job_categories")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ skills: [], desired_rate: "", experience_level: "beginner", job_categories: [] });
  }

  return NextResponse.json({
    skills: profile.skills || [],
    desired_rate: profile.desired_rate || "",
    experience_level: profile.experience_level || "beginner",
    job_categories: profile.job_categories || [],
  });
}
