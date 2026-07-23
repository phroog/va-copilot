import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, content } = await request.json();
  if (!jobId || !content) {
    return NextResponse.json({ error: "jobId and content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pitches")
    .update({ content })
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pitch: data });
}
