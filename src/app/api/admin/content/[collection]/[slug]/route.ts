import { failure, guard, json } from "@/lib/admin/api";
import { deleteAlbum, deleteEntry, deletePlayer } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(req: Request, { params }: { params: Promise<{ collection: string; slug: string }> }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { collection, slug } = await params;
  try {
    if (collection === "updates" || collection === "articles") return json(200, { ok: true, commit: await deleteEntry(collection, slug) });
    if (collection === "gallery") return json(200, { ok: true, commit: await deleteAlbum(slug) });
    if (collection === "players") return json(200, { ok: true, commit: await deletePlayer(slug) });
    return json(404, { ok: false, message: "Not found." });
  } catch (e) {
    return failure(e);
  }
}
