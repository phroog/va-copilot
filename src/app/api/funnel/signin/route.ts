import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

// Funnel sign-in: creates (confirmed) or finds the user, generates a magic-link
// token, and exchanges it for a REAL session on the server — writing the auth
// cookies directly. No email click, no client-side token juggling.
export async function POST(request: Request) {
  const { email, whatsapp } = await request.json().catch(() => ({}));
  const e = (email || "").trim().toLowerCase();
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  async function linkData(): Promise<{ token?: string; tokenHash?: string; otp?: string } | null> {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: e });
    if (error || !data) return null;
    const link = data.properties?.action_link ?? "";
    let tokenHash: string | undefined;
    try {
      tokenHash = new URL(link).searchParams.get("token_hash") ?? undefined;
    } catch {}
    return {
      token: new URL(link).searchParams.get("token") ?? undefined,
      tokenHash,
      otp: data.properties?.email_otp ?? undefined,
    };
  }

  let link = await linkData();
  if (!link) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: e,
      email_confirm: true,
      user_metadata: { whatsapp: (whatsapp || "").trim() },
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || "Couldn't create your account" }, { status: 500 });
    }
    link = await linkData();
  }
  if (!link || (!link.token && !link.tokenHash && !link.otp)) {
    return NextResponse.json({ error: "Couldn't start your session" }, { status: 500 });
  }

  // Exchange the token for a session on the server so the auth cookies are set.
  const supabase = createClient();
  let ok = false;
  if (link.token) {
    const r = await supabase.auth.verifyOtp({ type: "magiclink", email: e, token: link.token });
    ok = !r.error;
  }
  if (!ok && link.tokenHash) {
    const r = await supabase.auth.verifyOtp({ type: "email", token_hash: link.tokenHash });
    ok = !r.error;
  }
  if (!ok && link.otp) {
    const r = await supabase.auth.verifyOtp({ type: "email", email: e, token: link.otp });
    ok = !r.error;
  }

  return NextResponse.json({ ok, signedIn: ok, email: e });
}