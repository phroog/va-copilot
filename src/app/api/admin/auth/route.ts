import { NextResponse } from "next/server";
import { createAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";
  const expectedUser = process.env.ADMIN_DASHBOARD_USERNAME || "";
  const expectedPass = process.env.ADMIN_DASHBOARD_PASSWORD || "";

  if (!expectedUser || !expectedPass) {
    return NextResponse.json({ error: "Admin dashboard not configured" }, { status: 500 });
  }

  // Constant-time-ish comparison to avoid trivial timing signals
  const userOk = username.length === expectedUser.length && username === expectedUser;
  const passOk = password.length === expectedPass.length && password === expectedPass;
  if (!userOk || !passOk) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createAdminSession(process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}