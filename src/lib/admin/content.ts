import "server-only";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import sharp from "sharp";
import { ArticleFrontmatter, GalleryAlbumFile, GalleryManifest, Player, UpdateFrontmatter } from "@/content/schema";
import playersPage from "@/content/sources/local/players.json";
import articleCategories from "@/content/sources/local/article-categories.json";
import galleryCategories from "@/content/sources/local/gallery-categories.json";
import people from "@/content/sources/local/people.json";
import { getStorage, type Change } from "./storage";
import { nameFrom } from "./shared";
import { isProtected } from "@/config/protected-content";
import { createHash } from "node:crypto";

/**
 * What the admin edits, written in exactly the same files and formats as
 * the hand-written content (see the templates and README). Everything is
 * checked with the site's own schemas before it is saved, so a publish can
 * never break the website build.
 */

const CONTENT = "src/content/sources/local";
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Never used as a web address: the two templates, and "new" (the admin's "create" page). */
const TEMPLATES = new Set(["update-template", "article-template", "new"]);
const BLOB_ID = /^[0-9a-f]{40}$/;

export class ContentError extends Error {
  constructor(
    message: string,
    public issues?: string[],
  ) {
    super(message);
  }
}

export type Collection = "updates" | "articles";

/* ------------------------------------------------------------------ helpers */

function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  return { data: (parseYaml(m[1]) ?? {}) as Record<string, unknown>, body: m[2].replace(/^\r?\n/, "") };
}

function toMarkdown(data: Record<string, unknown>, body: string): string {
  return `---\n${stringifyYaml(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}

/** Drop empty strings, empty objects and undefined, recursively. */
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined && x !== "") as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      const c = clean(x);
      if (c === undefined || c === "" || c === null) continue;
      if (typeof c === "object" && !Array.isArray(c) && Object.keys(c as object).length === 0) continue;
      out[k] = c;
    }
    return out as T;
  }
  if (typeof v === "string") return v.trim() as T;
  return v;
}

function issuesOf(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(" → ") || "details"}: ${i.message}`);
}

const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10); // India date

/* ------------------------------------------------------- updates & articles */

export interface ListItem {
  slug: string;
  title: string;
  date: string;
  draft: boolean;
  label?: string;
  pinned?: boolean;
  invalid?: boolean;
}

export async function listEntries(collection: Collection): Promise<ListItem[]> {
  const storage = getStorage();
  const files = (await storage.list(`${CONTENT}/${collection}`)).filter((f) => /\/[a-z0-9-]+\.md$/.test(f));
  const items = await Promise.all(
    files.map(async (f): Promise<ListItem | null> => {
      const slug = f.split("/").pop()!.replace(/\.md$/, "");
      if (TEMPLATES.has(slug)) return null;
      const text = await storage.readText(f);
      if (text === null) return null;
      const { data } = splitFrontmatter(text);
      const schema = collection === "updates" ? UpdateFrontmatter : ArticleFrontmatter;
      const ok = schema.safeParse(data).success;
      return {
        slug,
        title: String(data.title ?? slug),
        date: String(data.publishedAt ?? ""),
        draft: data.draft === true,
        label: String(collection === "updates" ? (data.type ?? "") : (data.category ?? "")),
        pinned: data.pinned === true,
        invalid: !ok,
      };
    }),
  );
  return items.filter((x): x is ListItem => !!x).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export async function readEntry(collection: Collection, slug: string): Promise<{ data: Record<string, unknown>; body: string } | null> {
  if (!SLUG.test(slug) || TEMPLATES.has(slug)) return null;
  const text = await getStorage().readText(`${CONTENT}/${collection}/${slug}.md`);
  return text === null ? null : splitFrontmatter(text);
}

export interface Upload {
  /** Repository path, e.g. public/updates/<slug>/photo-ab12.webp */
  path: string;
  blob: string;
}

export interface SaveEntryInput {
  mode: "create" | "edit";
  data: Record<string, unknown>;
  body: string;
  uploads?: Upload[];
}

export async function saveEntry(collection: Collection, input: SaveEntryInput): Promise<{ slug: string; commit: string; draft: boolean }> {
  const storage = getStorage();
  const data = clean({ ...input.data });
  const slug = String(data.slug ?? "");
  if (!SLUG.test(slug) || TEMPLATES.has(slug)) throw new ContentError("Choose a web address using lowercase letters, numbers and hyphens, e.g. pune-open-2026.");
  const file = `${CONTENT}/${collection}/${slug}.md`;
  const existing = await storage.readText(file);
  if (input.mode === "create" && existing !== null) throw new ContentError(`There is already ${collection === "updates" ? "an update" : "an article"} at this web address (${slug}). Choose another.`);
  if (input.mode === "edit" && existing === null) throw new ContentError("This item no longer exists — it may have been deleted.");

  const body = String(input.body ?? "").replace(/\r\n/g, "\n");
  if (!body.trim()) throw new ContentError("Write the text before publishing.");

  const schema = collection === "updates" ? UpdateFrontmatter : ArticleFrontmatter;
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ContentError("Some details need fixing.", issuesOf(parsed.error));

  // Cross-checks the website build also makes.
  if (collection === "articles") {
    const a = parsed.data as z.infer<typeof ArticleFrontmatter>;
    if (!articleCategories.some((c) => c.id === a.category)) throw new ContentError(`Unknown category "${a.category}".`);
    if ("personId" in a.author && !people.some((p) => p.id === (a.author as { personId: string }).personId)) throw new ContentError("Unknown author.");
  } else {
    const u = parsed.data as z.infer<typeof UpdateFrontmatter>;
    if (u.article) {
      const art = await readEntry("articles", u.article);
      if (!art) throw new ContentError(`The linked article "${u.article}" does not exist.`);
      if (art.data.draft === true && data.draft !== true) throw new ContentError("The linked article is still a draft — publish it first, or remove the link.");
    }
  }

  // Images: keep the ones the text or details still use, add new uploads, delete the rest.
  const folder = `public/${collection}/${slug}`;
  const text = toMarkdown(data, body);
  const used = (p: string) => text.includes("/" + p.replace(/^public\//, ""));
  const changes: Change[] = [{ path: file, text }];
  for (const u of input.uploads ?? []) {
    if (!u.path.startsWith(`${folder}/`) || !/^[a-z0-9-]+\.webp$/.test(u.path.slice(folder.length + 1)) || !BLOB_ID.test(u.blob)) throw new ContentError("An uploaded image is invalid — please upload it again.");
    if (used(u.path)) changes.push({ path: u.path, blob: u.blob });
  }
  const uploaded = new Set((input.uploads ?? []).map((u) => u.path));
  for (const old of await storage.list(folder)) if (!used(old) && !uploaded.has(old)) changes.push({ path: old, delete: true });

  const title = String(data.title);
  const draft = data.draft === true;
  const what = collection === "updates" ? "update" : "article";
  const verb = draft ? "Save draft" : input.mode === "create" ? "Publish" : "Edit";
  const commit = await storage.commit(`Admin: ${verb} ${what} "${title}"`, changes);
  return { slug, commit, draft };
}

export async function deleteEntry(collection: Collection, slug: string): Promise<string> {
  if (!SLUG.test(slug) || TEMPLATES.has(slug)) throw new ContentError("Not found.");
  if (isProtected(collection, slug)) throw new ContentError("This article is protected and can't be deleted from the admin.");
  const storage = getStorage();
  const entry = await readEntry(collection, slug);
  if (!entry) throw new ContentError("This item no longer exists.");
  if (collection === "articles") {
    // Updates that link to this article would break the build.
    for (const u of await listEntries("updates")) {
      const e = await readEntry("updates", u.slug);
      if (e?.data.article === slug) throw new ContentError(`The update "${u.title}" links to this article. Remove the link there first.`);
    }
  }
  const changes: Change[] = [{ path: `${CONTENT}/${collection}/${slug}.md`, delete: true }, ...(await storage.list(`public/${collection}/${slug}`)).map((p) => ({ path: p, delete: true as const }))];
  return storage.commit(`Admin: Delete ${collection === "updates" ? "update" : "article"} "${String(entry.data.title ?? slug)}"`, changes);
}

/* ------------------------------------------------------------------- images */

const MAX_UPLOAD = 4 * 1024 * 1024;

/** A photo for an update or article: one 1600px-wide WebP, no metadata. */
export async function processImage(collection: Collection | "players", slug: string, original: string, data: Buffer) {
  if (!SLUG.test(slug)) throw new ContentError("Set the web address (slug) before adding photos.");
  if (data.length > MAX_UPLOAD) throw new ContentError("This photo is too large.");
  const img = sharp(data, { failOn: "none" }).rotate();
  const { data: out, info } = await img.resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const name = `${nameFrom(original)}-${Math.random().toString(36).slice(2, 6)}.webp`;
  const blob = await getStorage().putBinary(out);
  return { path: `public/${collection}/${slug}/${name}`, src: `/${collection}/${slug}/${name}`, blob, width: info.width, height: info.height };
}

/* ------------------------------------------------------------------ gallery */

const GALLERY_WIDTHS = [480, 960, 1600, 2400];

export interface AlbumListItem {
  slug: string;
  title: string;
  date: string;
  draft: boolean;
  count: number;
  cover?: string;
}

export async function listAlbums(): Promise<AlbumListItem[]> {
  const storage = getStorage();
  const files = (await storage.list(`${CONTENT}/gallery`)).filter((f) => f.endsWith("/album.yaml"));
  const out = await Promise.all(
    files.map(async (f): Promise<AlbumListItem | null> => {
      const slug = f.split("/").slice(-2)[0];
      const a = await readAlbum(slug);
      if (!a) return null;
      const coverFile = a.album.cover || a.album.photos[0]?.file;
      const m = coverFile ? a.manifest[coverFile] : undefined;
      return { slug, title: a.album.title, date: a.album.date, draft: a.album.draft, count: a.album.photos.length, cover: m ? `/gallery/${slug}/${m.id}-${m.widths[0]}.webp` : undefined };
    }),
  );
  return out.filter((x): x is AlbumListItem => !!x).sort((a, b) => b.date.localeCompare(a.date));
}

export async function readAlbum(slug: string) {
  if (!SLUG.test(slug)) return null;
  const storage = getStorage();
  const yaml = await storage.readText(`${CONTENT}/gallery/${slug}/album.yaml`);
  if (yaml === null) return null;
  const raw = (parseYaml(yaml) ?? {}) as Record<string, unknown>;
  const album = GalleryAlbumFile.safeParse(raw);
  const manifestText = await storage.readText(`${CONTENT}/gallery/${slug}/photos.json`);
  const manifest = manifestText ? GalleryManifest.safeParse(JSON.parse(manifestText)) : null;
  return {
    album: album.success
      ? album.data
      : { title: String(raw.title ?? slug), date: String(raw.date ?? today()), draft: raw.draft === true, photos: [], city: undefined, description: undefined, cover: undefined },
    manifest: manifest?.success ? manifest.data : {},
  };
}

export type ManifestEntry = GalleryManifest[string];

/** One gallery photo: the same sizes, placeholder and metadata stripping as `npm run gallery`. */
export async function processGalleryPhoto(album: string, file: string, data: Buffer) {
  if (!SLUG.test(album)) throw new ContentError("Set the album's web address before adding photos.");
  if (data.length > MAX_UPLOAD) throw new ContentError("This photo is too large.");
  const id = nameFrom(file);
  const { data: oriented, info } = await sharp(data, { failOn: "none" }).rotate().toBuffer({ resolveWithObject: true });
  const max = Math.min(info.width, GALLERY_WIDTHS[GALLERY_WIDTHS.length - 1]);
  const widths = [...new Set([...GALLERY_WIDTHS.filter((w) => w < max), max])];
  const storage = getStorage();
  const blobs: Upload[] = [];
  for (const w of widths) {
    const out = await sharp(oriented).resize({ width: w }).webp({ quality: 80 }).toBuffer();
    blobs.push({ path: `public/gallery/${album}/${id}-${w}.webp`, blob: await storage.putBinary(out) });
  }
  const blur = await sharp(oriented).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  const entry: ManifestEntry = {
    id,
    width: max,
    height: Math.round((info.height * max) / info.width),
    widths,
    blur: `data:image/webp;base64,${blur.toString("base64")}`,
    hash: createHash("sha1").update(data).digest("hex").slice(0, 16),
  };
  return { file, entry, blobs };
}

export interface SaveAlbumInput {
  mode: "create" | "edit";
  slug: string;
  album: { title: string; date: string; category?: string; city?: string; description?: string; cover?: string; draft: boolean; photos: Array<{ file: string; alt: string; caption?: string }> };
  newPhotos?: Record<string, { entry: ManifestEntry; blobs: Upload[] }>;
}

export async function saveAlbum(input: SaveAlbumInput): Promise<{ slug: string; commit: string; draft: boolean }> {
  const storage = getStorage();
  const slug = input.slug;
  if (!SLUG.test(slug)) throw new ContentError("Choose a web address using lowercase letters, numbers and hyphens, e.g. pune-open-2026.");
  if (slug === "new") throw new ContentError("Choose another web address.");
  const current = await readAlbum(slug);
  if (input.mode === "create" && current) throw new ContentError(`There is already an album at this web address (${slug}). Choose another.`);
  if (input.mode === "edit" && !current) throw new ContentError("This album no longer exists — it may have been deleted.");

  const album = clean({ ...input.album, draft: input.album.draft === true });
  if (!album.photos?.length) throw new ContentError("Add at least one photo.");
  const parsed = GalleryAlbumFile.safeParse(album);
  if (!parsed.success) throw new ContentError("Some details need fixing.", issuesOf(parsed.error));
  if (album.cover && !album.photos.some((p) => p.file === album.cover)) delete album.cover;
  if (album.category && !galleryCategories.some((c) => c.id === album.category)) throw new ContentError(`Unknown category "${album.category}".`);

  // Photo sizes: from new uploads or the existing manifest.
  const manifest: GalleryManifest = {};
  const changes: Change[] = [];
  const staged = new Map<string, string>(); // repo path → blob id
  const ids = new Set<string>();
  for (const p of album.photos) {
    const fresh = input.newPhotos?.[p.file];
    const entry = fresh?.entry ?? current?.manifest[p.file];
    if (!entry) throw new ContentError(`The photo "${p.file}" did not finish uploading — please add it again.`);
    if (!SLUG.test(entry.id) || ids.has(entry.id)) throw new ContentError(`Two photos have the same name (${entry.id}). Remove one and add it again.`);
    ids.add(entry.id);
    manifest[p.file] = GalleryManifest.parse({ [p.file]: entry })[p.file];
    if (fresh) {
      for (const b of fresh.blobs) {
        if (!b.path.startsWith(`public/gallery/${slug}/${entry.id}-`) || !BLOB_ID.test(b.blob)) throw new ContentError("An uploaded photo is invalid — please add it again.");
        staged.set(b.path, b.blob);
        changes.push({ path: b.path, blob: b.blob });
      }
    }
  }

  // Link-preview collage: cover first, then the next three.
  const order = [...album.photos].sort((a, b) => (a.file === album.cover ? -1 : b.file === album.cover ? 1 : 0)).slice(0, 4);
  const W = 1200,
    H = 630;
  const tiles =
    order.length === 1
      ? [{ x: 0, y: 0, w: W, h: H }]
      : order.length === 2
        ? [{ x: 0, y: 0, w: 600, h: H }, { x: 600, y: 0, w: 600, h: H }]
        : order.length === 3
          ? [{ x: 0, y: 0, w: 700, h: H }, { x: 700, y: 0, w: 500, h: 315 }, { x: 700, y: 315, w: 500, h: 315 }]
          : [{ x: 0, y: 0, w: 700, h: H }, { x: 700, y: 0, w: 500, h: 315 }, { x: 700, y: 315, w: 250, h: 315 }, { x: 950, y: 315, w: 250, h: 315 }];
  const layers = await Promise.all(
    order.map(async (p, i) => {
      const m = manifest[p.file];
      const w = m.widths.find((x) => x >= 960) ?? m.widths[m.widths.length - 1];
      const path = `public/gallery/${slug}/${m.id}-${w}.webp`;
      const src = staged.has(path) ? await storage.readStaged(staged.get(path)!) : await storage.readBinary(path);
      if (!src) throw new ContentError("Could not build the link preview — please try again.");
      const t = tiles[i];
      return { input: await sharp(src).resize(t.w - 4, t.h - 4, { fit: "cover" }).toBuffer(), left: t.x + 2, top: t.y + 2 };
    }),
  );
  const og = await sharp({ create: { width: W, height: H, channels: 3, background: "#050807" } }).composite(layers).jpeg({ quality: 82 }).toBuffer();
  changes.push({ path: `public/gallery/${slug}/og.jpg`, blob: await storage.putBinary(og) });

  // Remove files of photos that were taken out.
  const keep = new Set([`public/gallery/${slug}/og.jpg`, ...Object.values(manifest).flatMap((m) => m.widths.map((w) => `public/gallery/${slug}/${m.id}-${w}.webp`))]);
  for (const old of await storage.list(`public/gallery/${slug}`)) if (!keep.has(old)) changes.push({ path: old, delete: true });

  const yaml = `# Album details — managed in the admin (/admin/gallery). Photos are listed in display order.\n${stringifyYaml(album, { lineWidth: 0 })}`;
  changes.push({ path: `${CONTENT}/gallery/${slug}/album.yaml`, text: yaml });
  changes.push({ path: `${CONTENT}/gallery/${slug}/photos.json`, text: JSON.stringify(manifest, null, 2) + "\n" });

  const draft = album.draft === true;
  const verb = draft ? "Save draft" : input.mode === "create" ? "Publish" : "Edit";
  const commit = await storage.commit(`Admin: ${verb} album "${album.title}"`, changes);
  return { slug, commit, draft };
}

export async function deleteAlbum(slug: string): Promise<string> {
  const storage = getStorage();
  const a = await readAlbum(slug);
  if (!a) throw new ContentError("This album no longer exists.");
  const files = [...(await storage.list(`${CONTENT}/gallery/${slug}`)), ...(await storage.list(`public/gallery/${slug}`))];
  return storage.commit(`Admin: Delete album "${a.album.title}"`, files.map((p) => ({ path: p, delete: true as const })));
}

export { today };

/* ------------------------------------------------------------------ players */

export interface PlayerListItem {
  slug: string;
  name: string;
  district?: string;
  draft: boolean;
  results: number;
  photo?: string;
  topSeven: boolean;
}

const topSevenSlugs = () => new Set((playersPage.featured as Array<{ slug: string }>).map((f) => f.slug));

export async function listPlayers(): Promise<PlayerListItem[]> {
  const storage = getStorage();
  const files = (await storage.list(`${CONTENT}/players`)).filter((f) => f.endsWith(".json"));
  const top = topSevenSlugs();
  const items = await Promise.all(
    files.map(async (f): Promise<PlayerListItem | null> => {
      const text = await storage.readText(f);
      if (!text) return null;
      const d = JSON.parse(text) as Record<string, unknown>;
      const slug = f.split("/").pop()!.replace(/\.json$/, "");
      return {
        slug,
        name: String(d.name ?? slug),
        district: d.district ? String(d.district) : undefined,
        draft: d.draft === true,
        results: Array.isArray(d.results) ? d.results.length : 0,
        photo: (d.photo as { src?: string } | undefined)?.src,
        topSeven: top.has(slug),
      };
    }),
  );
  return items.filter((x): x is PlayerListItem => !!x).sort((a, b) => a.name.localeCompare(b.name));
}

export async function readPlayer(slug: string): Promise<Record<string, unknown> | null> {
  if (!SLUG.test(slug) || slug === "new") return null;
  const text = await getStorage().readText(`${CONTENT}/players/${slug}.json`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : null;
}

export async function savePlayer(input: { mode: "create" | "edit"; data: Record<string, unknown>; uploads?: Upload[] }): Promise<{ slug: string; commit: string; draft: boolean }> {
  const storage = getStorage();
  const data = clean({ ...input.data });
  const slug = String(data.slug ?? "");
  if (!SLUG.test(slug) || slug === "new") throw new ContentError("Choose a web address using lowercase letters, numbers and hyphens, e.g. first-last.");
  const file = `${CONTENT}/players/${slug}.json`;
  const existing = await storage.readText(file);
  if (input.mode === "create" && existing !== null) throw new ContentError(`There is already a player at this web address (${slug}). Choose another.`);
  if (input.mode === "edit" && existing === null) throw new ContentError("This player no longer exists — they may have been deleted.");
  const parsed = Player.safeParse(data);
  if (!parsed.success) throw new ContentError("Some details need fixing.", issuesOf(parsed.error));

  const text = JSON.stringify(data, null, 2) + "\n";
  const folder = `public/players/${slug}`;
  const used = (p: string) => text.includes("/" + p.replace(/^public\//, ""));
  const changes: Change[] = [{ path: file, text }];
  for (const u of input.uploads ?? []) {
    if (!u.path.startsWith(`${folder}/`) || !/^[a-z0-9-]+\.webp$/.test(u.path.slice(folder.length + 1)) || !BLOB_ID.test(u.blob)) throw new ContentError("An uploaded photo is invalid — please upload it again.");
    if (used(u.path)) changes.push({ path: u.path, blob: u.blob });
  }
  const uploaded = new Set((input.uploads ?? []).map((u) => u.path));
  for (const old of await storage.list(folder)) if (!used(old) && !uploaded.has(old)) changes.push({ path: old, delete: true });

  const draft = data.draft === true;
  const commit = await storage.commit(`Admin: ${draft ? "Save draft" : input.mode === "create" ? "Add" : "Edit"} player "${String(data.name)}"`, changes);
  return { slug, commit, draft };
}

export async function deletePlayer(slug: string): Promise<string> {
  const p = await readPlayer(slug);
  if (!p) throw new ContentError("This player no longer exists.");
  if (topSevenSlugs().has(slug)) throw new ContentError("This player is in Maharashtra's Top 7. Ask the developer to take them out of the line-up first.");
  const storage = getStorage();
  const changes: Change[] = [{ path: `${CONTENT}/players/${slug}.json`, delete: true }, ...(await storage.list(`public/players/${slug}`)).map((x) => ({ path: x, delete: true as const }))];
  return storage.commit(`Admin: Delete player "${String(p.name ?? slug)}"`, changes);
}
