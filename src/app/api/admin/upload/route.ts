import { failure, guard, json } from "@/lib/admin/api";
import { ContentError, processGalleryPhoto, processImage } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Upload one photo (raw image bytes in the body; the browser has already
 * shrunk it). Query: collection=updates|articles|gallery, slug, name.
 * The photo is resized and stored, but only goes live with the next Publish.
 */
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const collection = url.searchParams.get("collection");
  const slug = url.searchParams.get("slug") ?? "";
  const name = url.searchParams.get("name") ?? "photo.jpg";
  try {
    const size = Number(req.headers.get("content-length") ?? 0);
    if (size > 4 * 1024 * 1024) throw new ContentError("This photo is too large.");
    const data = Buffer.from(await req.arrayBuffer());
    if (!data.length) throw new ContentError("The photo was empty.");
    if (collection === "updates" || collection === "articles" || collection === "players" || collection === "officials") return json(200, { ok: true, ...(await processImage(collection, slug, name, data)) });
    if (collection === "gallery") return json(200, { ok: true, ...(await processGalleryPhoto(slug, name, data)) });
    return json(404, { ok: false, message: "Not found." });
  } catch (e) {
    if (e instanceof Error && /unsupported image format|Input buffer/i.test(e.message)) return failure(new ContentError("This file is not a photo we can read. Use JPG, PNG or WebP."));
    return failure(e);
  }
}
