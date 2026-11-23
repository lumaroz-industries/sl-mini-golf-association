import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Admin sign-in: one shared password (ADMIN_PASSWORD in Vercel), no accounts
 * and no database. A successful sign-in sets a signed, HttpOnly cookie that
 * lasts 12 hours. Changing ADMIN_PASSWORD signs everyone out.
 */

export const SESSION_COOKIE = "slmga_admin";
const SESSION_HOURS = 12;

const password = () => process.env.ADMIN_PASSWORD?.trim() ?? "";
export const adminConfigured = () => password().length >= 8;

/** Signing key: ADMIN_SESSION_SECRET if set, otherwise derived from the password. */
const key = () => createHash("sha256").update(`slmga-admin:${process.env.ADMIN_SESSION_SECRET || password()}`).digest();

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export function createSessionValue(): string {
  const exp = String(Date.now() + SESSION_HOURS * 3600_000);
  return `${exp}.${sign(exp)}`;
}

export function isValidSession(value: string | undefined): boolean {
  if (!value || !adminConfigured()) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordMatches(input: string): boolean {
  if (!adminConfigured()) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password()).digest();
  return timingSafeEqual(a, b);
}

export async function isSignedIn(): Promise<boolean> {
  return isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};

/* ------------------------------------------------------------ rate limiting
   Best effort (per server instance): 8 wrong passwords per 15 minutes. */
const attempts = new Map<string, { n: number; until: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export function loginBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  return !!a && a.n >= 8 && a.until > Date.now();
}

export function recordFailure(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.until < now) attempts.set(ip, { n: 1, until: now + 15 * 60_000 });
  else a.n++;
}

export function clearFailures(ip: string) {
  attempts.delete(ip);
}

/** Mutating admin requests must come from this site (on top of the SameSite cookie). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
