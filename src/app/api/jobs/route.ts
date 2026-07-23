import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const { data: userOrgs } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);

  const orgIds = (userOrgs ?? []).map((m: any) => m.org_id);

  let query = supabase.from("jobs").select("*");

  if (orgIds.length > 0) {
    query = query.or(`user_id.eq.${user.id},org_id.in.(${orgIds.join(",")})`);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data: jobs, error } = await query.order("posted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach has_pitch flag
  const { data: userPitches } = await supabase
    .from("pitches")
    .select("job_id")
    .eq("user_id", user.id);

  const pitchedJobIds = new Set((userPitches ?? []).map((p: any) => p.job_id));
  const jobsWithFlag = (jobs ?? []).map((j: any) => ({
    ...j,
    has_pitch: pitchedJobIds.has(j.id),
  }));

  return NextResponse.json({ jobs: jobsWithFlag });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, org_id } = body;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  if (org_id) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this organization" }, { status: 403 });
    }
  }

  const insert: Record<string, any> = {
    user_id: user.id,
    title,
    description: body.description ?? "",
    budget: body.budget ?? "",
    budget_type: body.budget_type ?? null,
    budget_amount: body.budget_amount ?? null,
    platform: body.platform ?? "Unknown",
    url: body.url ?? "",
    org_id: org_id ?? null,
    client_name: body.client_name ?? null,
    client_country: body.client_country ?? null,
    client_rating: body.client_rating ?? null,
    client_total_spent: body.client_total_spent ?? null,
    skills: body.skills ?? null,
    posted_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("jobs")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}
