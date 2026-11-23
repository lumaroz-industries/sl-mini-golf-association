import { guard, json } from "@/lib/admin/api";

export const dynamic = "force-dynamic";

/** Which commit the live site was built from — lets the admin show when a publish is live. */
export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  return json(200, { ok: true, commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
}
