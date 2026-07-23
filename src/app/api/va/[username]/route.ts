import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const supabase = createClient();
  const { username } = await params;

  // Fetch public profile
  const { data: pubProfile, error: profileError } = await supabase
    .from("user_public_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!pubProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const userId = pubProfile.user_id;

  // Fetch completed jobs count
  const { count: completedJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Fetch total hours from time_entries
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("start_time, end_time")
    .eq("user_id", userId)
    .not("end_time", "is", null);

  let totalHours = 0;
  if (timeEntries) {
    for (const entry of timeEntries) {
      const start = new Date(entry.start_time).getTime();
      const end = new Date(entry.end_time!).getTime();
      totalHours += (end - start) / 3600000;
    }
  }

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("client_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  // Also need to get job user_ids to filter reviews for this VA
  const { data: userJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId);

  const userJobIds = new Set((userJobs ?? []).map((j: any) => j.id));
  const vaReviews = (reviews ?? []).filter((r: any) => userJobIds.has(r.job_id));

  const avgRating = vaReviews.length > 0
    ? vaReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / vaReviews.length
    : 0;

  return NextResponse.json({
    profile: pubProfile,
    stats: {
      completedJobs: completedJobs ?? 0,
      totalHours: Math.round(totalHours * 10) / 10,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: vaReviews.length,
    },
    reviews: vaReviews,
  });
}
