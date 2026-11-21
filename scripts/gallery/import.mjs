#!/usr/bin/env node
/**
 * Gallery import — `npm run gallery`
 *
 * 1. Put original photos in  gallery-originals/<album-slug>/   (JPG/PNG/WebP;
 *    this folder is not committed — keep your originals safe elsewhere too).
 * 2. Run `npm run gallery`. For every album it:
 *    - creates src/content/sources/local/gallery/<album-slug>/album.yaml if
 *      missing, and adds any new photos to it (with empty alt text to fill in),
 *    - resizes each photo to web sizes (WebP), auto-rotates it and strips all
 *      metadata (including phone GPS location),
 *    - makes a tiny blurred placeholder and records the sizes in photos.json,
 *    - builds a 1200×630 collage for link previews (og.jpg),
 *    - removes outputs for photos that were deleted from the originals folder.
 * 3. Fill in the alt text (and optional captions) in album.yaml, then commit.
 *
 * Only albums that have a gallery-originals folder are touched, so a fresh
 * clone without originals never deletes anything.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { parseDocument, YAMLSeq } from "yaml";

const ROOT = process.cwd();
const ORIGINALS = path.join(ROOT, "gallery-originals");
const CONTENT = path.join(ROOT, "src/content/sources/local/gallery");
const PUBLIC = path.join(ROOT, "public/gallery");
const WIDTHS = [480, 960, 1600, 2400];
const QUALITY = 80;
const IMAGE = /\.(jpe?g|png|webp)$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugify = (name) =>
  name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "photo";

const today = () => new Date().toISOString().slice(0, 10);

async function processAlbum(slug) {
  const srcDir = path.join(ORIGINALS, slug);
  const contentDir = path.join(CONTENT, slug);
  const outDir = path.join(PUBLIC, slug);
  await mkdir(contentDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => IMAGE.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const skipped = (await readdir(srcDir)).filter((f) => !IMAGE.test(f) && !f.startsWith("."));
  for (const f of skipped) console.warn(`  ! ${slug}/${f}: not a JPG/PNG/WebP — skipped (export HEIC photos as JPG first)`);

  // ---- album.yaml: create if missing, append new photos
  const yamlPath = path.join(contentDir, "album.yaml");
  const doc = existsSync(yamlPath)
    ? parseDocument(await readFile(yamlPath, "utf8"))
    : parseDocument(
        [
          `# Album details — edit freely. Photos are added by \`npm run gallery\`.`,
          `title: ${slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
          `date: "${today()}"   # YYYY-MM-DD`,
          `# city: Pune`,
          `# description: One or two sentences about the event.`,
          `# cover: photo-file-name.jpg   # defaults to the first photo`,
          `draft: false`,
          `photos: []`,
          ``,
        ].join("\n"),
      );
  if (!doc.has("photos") || !(doc.get("photos") instanceof YAMLSeq)) doc.set("photos", doc.createNode([]));
  const seq = doc.get("photos");
  if (seq.items.length === 0) seq.flow = false;
  const listed = new Set(seq.items.map((n) => n.get?.("file")));
  let added = 0;
  for (const f of files) {
    if (!listed.has(f)) {
      seq.add(doc.createNode({ file: f, alt: "", caption: "" }));
      added++;
    }
  }

  // ---- images
  const manifestPath = path.join(contentDir, "photos.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};
  const ids = new Set();
  let processed = 0;
  for (const f of files) {
    const input = await readFile(path.join(srcDir, f));
    const hash = createHash("sha1").update(input).digest("hex").slice(0, 16);
    let id = slugify(f);
    while (ids.has(id)) id += "-x";
    ids.add(id);
    const prev = manifest[f];
    if (prev && prev.hash === hash && prev.id === id && prev.widths.every((w) => existsSync(path.join(outDir, `${id}-${w}.webp`)))) continue;

    const base = sharp(input, { failOn: "none" }).rotate(); // auto-orient; output carries no metadata
    const { data: oriented, info } = await base.toBuffer({ resolveWithObject: true });
    const max = Math.min(info.width, WIDTHS[WIDTHS.length - 1]);
    const widths = [...new Set([...WIDTHS.filter((w) => w < max), max])];
    for (const w of widths) {
      await sharp(oriented).resize({ width: w }).webp({ quality: QUALITY }).toFile(path.join(outDir, `${id}-${w}.webp`));
    }
    const blur = await sharp(oriented).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    const height = Math.round((info.height * max) / info.width);
    manifest[f] = { id, width: max, height, widths, blur: `data:image/webp;base64,${blur.toString("base64")}`, hash };
    processed++;
  }

  // ---- remove photos that no longer exist
  for (const f of Object.keys(manifest)) if (!files.includes(f)) delete manifest[f];
  const keep = new Set(Object.values(manifest).flatMap((m) => m.widths.map((w) => `${m.id}-${w}.webp`)));
  keep.add("og.jpg");
  for (const f of await readdir(outDir)) if (!keep.has(f)) await rm(path.join(outDir, f));
  const removed = seq.items.length;
  seq.items = seq.items.filter((n) => files.includes(n.get?.("file")));
  const dropped = removed - seq.items.length;

  // ---- link preview collage (cover first, then the next three)
  const cover = doc.get("cover");
  const order = [...files].sort((a, b) => (a === cover ? -1 : b === cover ? 1 : 0)).slice(0, 4);
  if (order.length) {
    const W = 1200, H = 630;
    const tiles =
      order.length === 1
        ? [{ x: 0, y: 0, w: W, h: H }]
        : order.length === 2
          ? [{ x: 0, y: 0, w: 600, h: H }, { x: 600, y: 0, w: 600, h: H }]
          : order.length === 3
            ? [{ x: 0, y: 0, w: 700, h: H }, { x: 700, y: 0, w: 500, h: 315 }, { x: 700, y: 315, w: 500, h: 315 }]
            : [{ x: 0, y: 0, w: 700, h: H }, { x: 700, y: 0, w: 500, h: 315 }, { x: 700, y: 315, w: 250, h: 315 }, { x: 950, y: 315, w: 250, h: 315 }];
    const layers = await Promise.all(
      order.map(async (f, i) => {
        const t = tiles[i];
        const img = await sharp(await readFile(path.join(srcDir, f)), { failOn: "none" }).rotate().resize(t.w - 4, t.h - 4, { fit: "cover" }).toBuffer();
        return { input: img, left: t.x + 2, top: t.y + 2 };
      }),
    );
    await sharp({ create: { width: W, height: H, channels: 3, background: "#050807" } }).composite(layers).jpeg({ quality: 82 }).toFile(path.join(outDir, "og.jpg"));
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(yamlPath, doc.toString({ lineWidth: 0 }));

  const missingAlt = seq.items.filter((n) => !String(n.get?.("alt") ?? "").trim()).length;
  console.log(`✓ ${slug}: ${files.length} photos (${processed} processed${added ? `, ${added} new` : ""}${dropped ? `, ${dropped} removed` : ""})`);
  if (missingAlt) console.log(`  → add alt text for ${missingAlt} photo${missingAlt > 1 ? "s" : ""} in src/content/sources/local/gallery/${slug}/album.yaml`);
}

async function main() {
  if (!existsSync(ORIGINALS)) {
    await mkdir(ORIGINALS, { recursive: true });
    console.log("Created gallery-originals/. Add a folder per album (e.g. gallery-originals/pune-open-2026/) with photos, then run again.");
    return;
  }
  const albums = (await readdir(ORIGINALS, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  if (!albums.length) return console.log("No album folders in gallery-originals/ yet.");
  for (const slug of albums) {
    if (!SLUG.test(slug)) {
      console.warn(`  ! gallery-originals/${slug}: rename the folder using lowercase letters, numbers and hyphens (e.g. pune-open-2026).`);
      continue;
    }
    await processAlbum(slug);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
