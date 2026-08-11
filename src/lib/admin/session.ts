const enc = new TextEncoder();

// HMAC-SHA256 helper using Web Crypto so it works in both Edge (middleware)
// and Node (route handlers). Returns hex string.
async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - (value.length % 4)) % 4);
  return atob(padded);
}

export const ADMIN_SESSION_COOKIE = "sari_admin_session";
export const ADMIN_SESSION_HOURS = 12;

/** Create a signed admin session token: base64url(payload).hex(signature) */
export async function createAdminSession(secret: string): Promise<string> {
  const exp = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
  const payload = b64url(JSON.stringify({ sub: "admin", exp }));
  const signature = await hmacHex(payload, secret);
  return `${payload}.${signature}`;
}

/** Verify and decode an admin session token. Returns true when valid+unexpired. */
export async function verifyAdminSession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await hmacHex(payload, secret);
  if (expected !== signature) return false;
  try {
    const data = JSON.parse(b64urlDecode(payload));
    return data.sub === "admin" && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}