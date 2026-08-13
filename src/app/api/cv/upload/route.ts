import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/cv/upload (multipart/form-data, field "file")
 * Stores an existing CV document (PDF/image) in the public `cvs` bucket and
 * links it to the user's CV row.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const allowed = ["pdf", "png", "jpg", "jpeg", "docx", "txt"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, PNG, JPG, DOCX or TXT." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${user.id}/upload.${ext}`;
  const service = createServiceRoleClient();
  const { error } = await service.storage.from("cvs").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
    cacheControl: "3600",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicUrl } = service.storage.from("cvs").getPublicUrl(path);
  const url = publicUrl.publicUrl;

  await supabase.from("cvs").upsert(
    { user_id: user.id, file_url: url, file_name: file.name },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ url, fileName: file.name });
}