import { failure, guard, json } from "@/lib/admin/api";
import { isPlayerSection, saveSection } from "@/lib/admin/content";
import { assertSectionPins } from "@/lib/admin/locks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Publish a level section — international, national or state (body: { players: [slug, …] } in order). */
export async function PUT(req: Request, { params }: { params: Promise<{ section: string }> }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { section } = await params;
  if (!isPlayerSection(section)) return json(404, { ok: false, message: "Not found." });
  try {
    const body = (await req.json()) as { players?: unknown };
    await assertSectionPins(section, body.players);
    return json(200, { ok: true, ...(await saveSection(section, body.players)) });
  } catch (e) {
    return failure(e);
  }
}
