import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { image_data_url, time_entry_id } = await request.json();
    if (!image_data_url || !time_entry_id) {
      return NextResponse.json({ error: "image_data_url and time_entry_id are required" }, { status: 400 });
    }

    // Verify time entry belongs to user
    const { data: entry } = await supabase
      .from("time_entries")
      .select("id")
      .eq("id", time_entry_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Upload to Supabase Storage
    const base64Data = image_data_url.split(",")[1] || image_data_url;
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `screenshots/${user.id}/${time_entry_id}/${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(fileName, buffer, { contentType: "image/png", upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("screenshots").getPublicUrl(fileName);

    const { data, error } = await supabase
      .from("screenshots")
      .insert({
        user_id: user.id,
        time_entry_id,
        image_url: publicUrl,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ screenshot: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const timeEntryId = searchParams.get("time_entry_id");

  let query = supabase
    .from("screenshots")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });

  if (timeEntryId) {
    query = query.eq("time_entry_id", timeEntryId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screenshots: data ?? [] });
}
