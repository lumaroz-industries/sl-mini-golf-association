/** Helpers shared by the admin pages (browser) and the server. */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Pune Open 2026!" → "pune-open-2026" */
export function slugify(text: string, max = 60): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, max)
      .replace(/-$/, "") || ""
  );
}

/** File name → safe base name for stored images ("IMG_2041.JPG" → "img-2041"). */
export const nameFrom = (original: string) => slugify(original.replace(/\.[^.]+$/, ""), 40) || "photo";
