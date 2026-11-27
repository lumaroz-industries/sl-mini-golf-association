import { failure, guard, json } from "@/lib/admin/api";
import { saveTopSeven } from "@/lib/admin/content";
import { assertUnlocked } from "@/lib/admin/locks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Publish Maharashtra's Top 7 line-up (body: { lineup: { "left-3": slug | null, … } }). */
export async function PUT(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as { lineup?: Record<string, unknown>; lockPassword?: unknown };
    await assertUnlocked("top-seven", body.lockPassword);
    return json(200, { ok: true, ...(await saveTopSeven(body.lineup ?? {})) });
  } catch (e) {
    return failure(e);
  }
}
