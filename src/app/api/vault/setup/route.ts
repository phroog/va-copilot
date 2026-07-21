import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("vault_salt, vault_key_check")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    salt: data?.vault_salt || null,
    keyCheck: data?.vault_key_check || null,
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { salt, keyCheck } = await request.json();
  if (!salt || !keyCheck) {
    return NextResponse.json({ error: "salt and keyCheck required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ vault_salt: salt, vault_key_check: keyCheck })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
