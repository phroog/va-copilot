import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Seeds the standard web job sources (upsert by name). Protected by
 * ADMIN_SECRET so only the admin collector can register sources.
 */
const DEFAULT_SOURCES = [
  { name: "Upwork", platform: "Upwork", url: "https://www.upwork.com/nx/search/jobs/?q=virtual+assistant&sort=recency" },
  { name: "OnlineJobs.ph", platform: "OnlineJobs.ph", url: "https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=virtual+assistant" },
  { name: "Indeed", platform: "Indeed", url: "https://www.indeed.com/jobs?q=virtual+assistant&sort=date" },
  { name: "Freelancer.com", platform: "Freelancer", url: "https://www.freelancer.com/jobs/virtual-assistant" },
  { name: "Guru", platform: "Guru", url: "https://www.guru.com/d/jobs/" },
  { name: "Remote.co", platform: "Remote.co", url: "https://remote.co/remote-jobs/" },
  { name: "WorkingNomads", platform: "WorkingNomads", url: "https://www.workingnomads.com/jobs" },
  { name: "Jobspresso", platform: "Jobspresso", url: "https://jobspresso.co/?s=virtual+assistant" },
  { name: "RemoteOK", platform: "RemoteOK", url: "https://remoteok.com/remote-virtual-assistant-jobs" },
  { name: "PeoplePerHour", platform: "PeoplePerHour", url: "https://www.peopleperhour.com/freelance-virtual-assistant-jobs" },
];

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const results = [];
  let errors = 0;

  for (const s of DEFAULT_SOURCES) {
    const { data, error } = await supabase
      .from("job_sources")
      .upsert(
        {
          name: s.name,
          platform: s.platform,
          url: s.url,
          source_type: "web",
          is_active: true,
          include_in_live_feed: true,
        },
        { onConflict: "name", ignoreDuplicates: true }
      )
      .select("id, name, platform")
      .maybeSingle();

    if (error) {
      errors++;
      results.push({ name: s.name, error: error.message });
    } else {
      results.push({ name: s.name, platform: s.platform, ok: true, id: data?.id });
    }
  }

  return NextResponse.json({ ok: errors === 0, results });
}
