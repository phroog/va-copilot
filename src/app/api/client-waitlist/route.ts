import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { name, email } = await request.json();
  if (!name || !email) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("client_waitlist")
    .insert({ name, email });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
