import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { data: jobs, error } = await query.order("posted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: jobs ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, budget, platform, url, org_id } = await request.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // If org_id provided, verify caller is a member
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

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      title,
      description: description ?? "",
      budget: budget ?? "",
      platform: platform ?? "Unknown",
      url: url ?? "",
      org_id: org_id ?? null,
      posted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}
