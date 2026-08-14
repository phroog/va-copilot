import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= maxRequests) return true;
  entry.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  // Rate limit AI API routes
  if (request.nextUrl.pathname.startsWith("/api/academy") || request.nextUrl.pathname.startsWith("/api/chat")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = user?.id ? `user:${user.id}` : `ip:${ip}`;
    if (isRateLimited(key, 30, 60_000)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  // Admin dashboard gate (separate password, independent of Supabase auth).
  // /admin/* pages and /api/admin/* routes require a valid admin session cookie.
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");
  const isAdminApi = request.nextUrl.pathname.startsWith("/api/admin");
  const isAdminLoginPage = request.nextUrl.pathname === "/admin/login";
  const isAdminAuthApi = request.nextUrl.pathname === "/api/admin/auth";

  if (isAdminPage && !isAdminLoginPage) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
    const adminOk = await verifyAdminSession(token, secret);
    if (!adminOk) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return Response.redirect(url);
    }
  }

  // API admin routes double-check the cookie themselves; only gate the login
  // endpoint so POSTs can reach it while signed out.
  if (isAdminApi && !isAdminAuthApi) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
    const adminOk = await verifyAdminSession(token, secret);
    if (!adminOk) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const protectedPaths = ["/dashboard", "/extension-auth"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?returnUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
    return Response.redirect(url);
  }

  if (!isProtected && user && request.nextUrl.pathname === "/auth/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return Response.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
