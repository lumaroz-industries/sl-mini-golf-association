import { failure, guard, json } from "@/lib/admin/api";
import { saveInternational } from "@/lib/admin/content";
import { assertInternationalPins } from "@/lib/admin/locks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Publish the International players section (body: { players: [slug, …] } in order). */
export async function PUT(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as { players?: unknown };
    await assertInternationalPins(body.players);
    return json(200, { ok: true, ...(await saveInternational(body.players)) });
  } catch (e) {
    return failure(e);
  }
}
