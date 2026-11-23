import { failure, guard, json } from "@/lib/admin/api";
import { saveAlbum, saveEntry, type SaveAlbumInput, type SaveEntryInput } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Publish, save as draft or edit an update, article or album. */
export async function PUT(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  const denied = await guard(req);
  if (denied) return denied;
  const { collection } = await params;
  try {
    const input = await req.json();
    if (collection === "updates" || collection === "articles") return json(200, { ok: true, ...(await saveEntry(collection, input as SaveEntryInput)) });
    if (collection === "gallery") return json(200, { ok: true, ...(await saveAlbum(input as SaveAlbumInput)) });
    return json(404, { ok: false, message: "Not found." });
  } catch (e) {
    return failure(e);
  }
}
