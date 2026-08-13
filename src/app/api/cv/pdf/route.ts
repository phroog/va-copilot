import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { generateCvPdf } from "@/lib/cv/pdf";
import { EMPTY_CV } from "@/lib/cv/types";

/**
 * POST /api/cv/pdf
 * Generates a styled CV PDF from the stored CV data, uploads it to the public
 * `cvs` bucket and returns { url, fileName }. Also streams the PDF back so the
 * client can offer it as a direct download.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: cv } = await supabase
    .from("cvs")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  const buffer = await generateCvPdf(cv?.data ?? EMPTY_CV);

  const fileName = `cv-${user.id.slice(0, 8)}.pdf`;
  const service = createServiceRoleClient();
  const { error: uploadError } = await service.storage
    .from("cvs")
    .upload(`${user.id}/cv.pdf`, Buffer.from(buffer), {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "3600",
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = service.storage.from("cvs").getPublicUrl(`${user.id}/cv.pdf`);
  const url = publicUrl.publicUrl;

  await supabase.from("cvs").upsert(
    { user_id: user.id, file_url: url, file_name: fileName },
    { onConflict: "user_id" }
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "X-CV-URL": encodeURIComponent(url),
    },
  });
}