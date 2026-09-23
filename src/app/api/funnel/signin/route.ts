import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Funnel sign-in: creates (confirmed) or finds the user and returns a magic-link
// token so the client can exchange it for a real session IMMEDIATELY — no email
// click required. The magic link is still emailed as a backup.
export async function POST(request: Request) {
  const { email, whatsapp } = await request.json().catch(() => ({}));
  const e = (email || "").trim().toLowerCase();
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  async function generateToken(): Promise<string | null> {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: e });
    if (error || !data) return null;
    const link = data.properties?.action_link ?? "";
    const m = link.match(/[?&]token=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  let token = await generateToken();
  if (!token) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: e,
      email_confirm: true,
      user_metadata: { whatsapp: (whatsapp || "").trim() },
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || "Couldn't create your account" }, { status: 500 });
    }
    token = await generateToken();
  }

  if (!token) return NextResponse.json({ error: "Couldn't start your session" }, { status: 500 });

  return NextResponse.json({ ok: true, token });
}