import { cookies } from "next/headers";
import { adminConfigured, clearFailures, clientIp, createSessionValue, loginBlocked, passwordMatches, recordFailure, sameOrigin, SESSION_COOKIE, sessionCookieOptions } from "@/lib/admin/auth";
import { json } from "@/lib/admin/api";

export const dynamic = "force-dynamic";

/** Sign in. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { ok: false, message: "This request was not accepted." });
  if (!adminConfigured()) return json(503, { ok: false, message: "The admin is not set up yet: add ADMIN_PASSWORD (at least 8 characters) in Vercel and redeploy." });
  const ip = await clientIp();
  if (loginBlocked(ip)) return json(429, { ok: false, message: "Too many attempts. Try again in 15 minutes." });
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (!passwordMatches(password)) {
    recordFailure(ip);
    await new Promise((r) => setTimeout(r, 600));
    return json(401, { ok: false, message: "That password is not correct." });
  }
  clearFailures(ip);
  (await cookies()).set(SESSION_COOKIE, createSessionValue(), sessionCookieOptions);
  return json(200, { ok: true });
}

/** Sign out. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json(403, { ok: false });
  (await cookies()).delete(SESSION_COOKIE);
  return json(200, { ok: true });
}
