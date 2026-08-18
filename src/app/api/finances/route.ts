import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convert, formatMoney, normalizeCurrency } from "@/lib/currency";

const BASE_CURRENCY = "EUR";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // User's base currency + default tax rate for the estimated tax view.
    const { data: profile } = await supabase
      .from("profiles")
      .select("base_currency")
      .eq("user_id", user.id)
      .maybeSingle();
    const base = normalizeCurrency(profile?.base_currency || BASE_CURRENCY);

    const { data: settings } = await supabase
      .from("user_settings")
      .select("default_tax_rate")
      .eq("user_id", user.id)
      .maybeSingle();
    const taxRate = Number(settings?.default_tax_rate) || 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    const toBase = (r: any) => convert(Number(r.amount) || 0, r.currency || "USD", base);

    const { data: allIncome } = await supabase
      .from("income_log")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(1000);

    const list = allIncome ?? [];

    // Totals in base currency
    let totalMonth = 0;
    let totalYear = 0;
    for (const r of list) {
      const earned = String(r.earned_at || "").slice(0, 7);
      const baseVal = toBase(r);
      if (earned === monthStr) totalMonth += baseVal;
      if (String(r.earned_at || "").slice(0, 4) === String(year)) totalYear += baseVal;
    }

    // Per-currency totals (for the multi-currency summary)
    const byCurrency: Record<string, number> = {};
    for (const r of list) {
      const c = normalizeCurrency(r.currency);
      byCurrency[c] = (byCurrency[c] || 0) + Number(r.amount || 0);
    }

    // Monthly breakdown (last 6 months) in base currency
    const monthlyBreakdown: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = list.filter((r) => String(r.earned_at || "").slice(0, 7) === m).reduce((s, r) => s + toBase(r), 0);
      monthlyBreakdown.push({ month: m, total });
    }

    // Recent earnings (with both original and converted amount)
    const recent = list.slice(0, 12).map((r: any) => ({
      ...r,
      amount_base: Math.round(toBase(r) * 100) / 100,
      currency: normalizeCurrency(r.currency),
    }));

    const estimatedTax = (totalYear * taxRate) / 100;

    return NextResponse.json({
      baseCurrency: base,
      taxRate,
      totalMonth,
      totalYear,
      estimatedTax,
      netYear: totalYear - estimatedTax,
      byCurrency,
      monthlyBreakdown,
      recent,
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

    const { amount, description, earned_at, currency } = await request.json();
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
        currency: normalizeCurrency(currency),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}