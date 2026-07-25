import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const end = searchParams.get("end") || new Date().toISOString().split("T")[0];

  // Find orgs where user is admin
  const { data: adminOrgs } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("role", "admin");

  const orgIds = (adminOrgs ?? []).map((m: any) => m.org_id);
  if (orgIds.length === 0) {
    return NextResponse.json({ error: "Not an agency admin" }, { status: 403 });
  }

  // Get all members of those orgs
  const { data: allMembers } = await supabase
    .from("org_members")
    .select("user_id, org_id, organizations(name)")
    .in("org_id", orgIds);

  const memberIds = Array.from(new Set((allMembers ?? []).map((m: any) => m.user_id)));
  const orgName = allMembers?.[0]?.organizations?.[0]?.name ?? "Agency";

  // Fetch aggregated data for all members
  const [timeEntries, pitches, invoices, profiles] = await Promise.all([
    supabase
      .from("time_entries")
      .select("user_id, hourly_rate, start_time, end_time")
      .in("user_id", memberIds)
      .gte("start_time", start + "T00:00:00Z")
      .lte("start_time", end + "T23:59:59Z"),
    supabase
      .from("pitches")
      .select("user_id, id")
      .in("user_id", memberIds)
      .gte("created_at", start + "T00:00:00Z")
      .lte("created_at", end + "T23:59:59Z"),
    supabase
      .from("invoices")
      .select("user_id, id, total")
      .in("user_id", memberIds)
      .gte("created_at", start + "T00:00:00Z")
      .lte("created_at", end + "T23:59:59Z"),
    supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", memberIds),
  ]);

  // Build member report
  const memberMap: Record<string, {
    user_id: string;
    full_name: string;
    total_hours: number;
    pitches_count: number;
    invoices_count: number;
    total_revenue: number;
    jobs_won: number;
  }> = {};

  for (const m of memberIds) {
    const prof = (profiles.data ?? []).find((p: any) => p.user_id === m);
    memberMap[m] = {
      user_id: m,
      full_name: prof?.full_name ?? m.slice(0, 8),
      total_hours: 0,
      pitches_count: 0,
      invoices_count: 0,
      total_revenue: 0,
      jobs_won: 0,
    };
  }

  // Aggregate time entries
  for (const entry of timeEntries.data ?? []) {
    if (!memberMap[entry.user_id]) continue;
    const startT = new Date(entry.start_time).getTime();
    const endT = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
    const hours = (endT - startT) / 3600000;
    memberMap[entry.user_id].total_hours += hours;
  }

  // Aggregate pitches
  for (const pitch of pitches.data ?? []) {
    if (memberMap[pitch.user_id]) memberMap[pitch.user_id].pitches_count++;
  }

  // Aggregate invoices
  for (const inv of invoices.data ?? []) {
    if (memberMap[inv.user_id]) {
      memberMap[inv.user_id].invoices_count++;
      memberMap[inv.user_id].total_revenue += parseFloat(inv.total || "0");
    }
  }

  const members = Object.values(memberMap);
  const totalAgencyHours = members.reduce((s, m) => s + m.total_hours, 0);
  const totalRevenue = members.reduce((s, m) => s + m.total_revenue, 0);
  const totalPitches = members.reduce((s, m) => s + m.pitches_count, 0);
  const totalInvoices = members.reduce((s, m) => s + m.invoices_count, 0);
  const activeMembers = members.filter(m => m.total_hours > 0).length;

  // Check CSV export
  const exportType = searchParams.get("export");
  if (exportType === "csv") {
    const header = "Member Name,Total Hours,Pitches Generated,Invoices Sent,Total Revenue";
    const rows = members.map(m => [
      `"${m.full_name}"`,
      m.total_hours.toFixed(2),
      m.pitches_count,
      m.invoices_count,
      m.total_revenue.toFixed(2),
    ].join(","));
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="agency-report-${start}-to-${end}.csv"`,
      },
    });
  }

  return NextResponse.json({
    org_name: orgName,
    start,
    end,
    total_agency_hours: totalAgencyHours,
    total_revenue: totalRevenue,
    total_pitches: totalPitches,
    total_invoices: totalInvoices,
    active_members: activeMembers,
    members,
  });
}
