import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = createClient();
  const { token } = await params;

  // Look up token
  const { data: tokenData } = await supabase
    .from("client_access_tokens")
    .select("*, jobs(*)")
    .eq("token", token)
    .maybeSingle();

  if (!tokenData) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410 });
  }

  const jobId = tokenData.job_id;

  // Fetch time entries for this job
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("job_id", jobId)
    .order("start_time", { ascending: false });

  // Fetch invoices linked to this job
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("job_id", jobId);

  // Proof of work: screenshots attached to this job's time entries.
  const { data: screenshots } = await supabase
    .from("screenshots")
    .select("id, time_entry_id, image_url, taken_at")
    .in("time_entry_id", (timeEntries ?? []).map((t: any) => t.id).filter(Boolean));

  return NextResponse.json({
    job: tokenData.jobs,
    timeEntries: timeEntries ?? [],
    invoices: invoices ?? [],
    screenshots: screenshots ?? [],
  });
}
