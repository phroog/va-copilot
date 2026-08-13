import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_CV, type CvData } from "@/lib/cv/types";

/** GET /api/cv — the user's CV (structured data + uploaded file). */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("cvs")
    .select("data, file_url, file_name, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    cv: {
      data: data?.data ?? EMPTY_CV,
      file_url: data?.file_url ?? null,
      file_name: data?.file_name ?? null,
      updated_at: data?.updated_at ?? null,
    },
  });
}

/** PUT /api/cv — save structured CV data. */
export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const data = (body?.data ?? {}) as CvData;
  if (typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "data must be an object" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("cvs")
    .upsert({ user_id: user.id, data }, { onConflict: "user_id" })
    .select("data, file_url, file_name, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cv: row });
}