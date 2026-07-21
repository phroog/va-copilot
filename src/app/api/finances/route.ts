import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    // Total this month
    const { data: monthIncome } = await supabase
      .from("income_log")
      .select("amount")
      .eq("user_id", user.id)
      .gte("earned_at", `${monthStr}-01`)
      .lte("earned_at", `${monthStr}-31`);

    const totalMonth = (monthIncome ?? []).reduce((s, r) => s + parseFloat(String(r.amount)), 0);

    // Total this year
    const { data: yearIncome } = await supabase
      .from("income_log")
      .select("amount")
      .eq("user_id", user.id)
      .gte("earned_at", `${year}-01-01`)
      .lte("earned_at", `${year}-12-31`);

    const totalYear = (yearIncome ?? []).reduce((s, r) => s + parseFloat(String(r.amount)), 0);

    // Monthly breakdown (last 6 months)
    const monthlyBreakdown: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const { data: incomes } = await supabase
        .from("income_log")
        .select("amount")
        .eq("user_id", user.id)
        .gte("earned_at", `${m}-01`)
        .lte("earned_at", `${m}-31`);
      const total = (incomes ?? []).reduce((s, r) => s + parseFloat(String(r.amount)), 0);
      monthlyBreakdown.push({ month: m, total });
    }

    // Recent earnings
    const { data: recent } = await supabase
      .from("income_log")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      totalMonth,
      totalYear,
      monthlyBreakdown,
      recent: recent ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, description, earned_at } = await request.json();
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("income_log")
      .insert({
        user_id: user.id,
        source: "manual",
        amount: parseFloat(amount),
        description: description ?? "",
        earned_at: earned_at ?? new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
