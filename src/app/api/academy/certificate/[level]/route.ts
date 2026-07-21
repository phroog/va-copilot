import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const levelNames: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
  business: "Business",
};

export async function GET(
  _request: Request,
  { params }: { params: { level: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: cert } = await supabase
    .from("academy_certificates")
    .select("*")
    .eq("user_id", user.id)
    .eq("level", params.level)
    .single();

  if (!cert) {
    return NextResponse.json({ earned: false, level: params.level });
  }

  return NextResponse.json({
    earned: true,
    level: params.level,
    level_name: levelNames[params.level] ?? params.level,
    issued_at: cert.issued_at,
  });
}
