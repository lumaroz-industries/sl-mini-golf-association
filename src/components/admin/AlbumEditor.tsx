"use client";

import { useRef, useState } from "react";
import { nameFrom, slugify } from "@/lib/admin/shared";
import { todayInIndia, uploadPhoto } from "./client";
import { Section, SlugField, TextArea, TextInput, Toggle } from "./fields";
import { PublishBar } from "./PublishBar";
import s from "./admin.module.css";

interface Entry {
  id: string;
  width: number;
  height: number;
  widths: number[];
  blur: string;
  hash: string;
}

interface Photo {
  file: string;
  alt: string;
  caption: string;
  id: string;
  /** Thumbnail: a local preview for new photos, the live file for existing ones. */
  thumb?: string;
  blur?: string;
  state: "ready" | "uploading" | "error";
  error?: string;
}

export interface AlbumInitial {
  slug?: string;
  title?: string;
  date?: string;
  city?: string;
  description?: string;
  cover?: string;
  draft?: boolean;
  photos?: Array<{ file: string; alt: string; caption?: string; id: string; blur: string; thumb: string }>;
}

export function AlbumEditor({ initial, isNew: startsNew }: { initial: AlbumInitial; isNew: boolean }) {
  const [isNew, setIsNew] = useState(startsNew);
  const [isDraft, setIsDraft] = useState(initial.draft ?? true);
  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [date, setDate] = useState(initial.date ?? todayInIndia());
  const [city, setCity] = useState(initial.city ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [cover, setCover] = useState(initial.cover ?? "");
  const [photos, setPhotos] = useState<Photo[]>((initial.photos ?? []).map((p) => ({ ...p, caption: p.caption ?? "", state: "ready" })));
  const [fresh, setFresh] = useState<Record<string, { entry: Entry; blobs: Array<{ path: string; blob: string }> }>>({});
  const [fill, setFill] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const effectiveSlug = slugTouched ? slug : slugify(title);

  const patch = (file: string, p: Partial<Photo>) => setPhotos((list) => list.map((x) => (x.file === file ? { ...x, ...p } : x)));

  async function add(files: FileList | null) {
    if (!files?.length) return;
    if (!effectiveSlug) return alert("Add the album title first — it sets the album's web address.");
    const taken = new Set(photos.map((p) => p.id));
    const queue: Array<{ file: File; key: string }> = [];
    const added: Photo[] = [];
    for (const f of [...files]) {
      let id = nameFrom(f.name);
      while (taken.has(id)) id += "-x";
      taken.add(id);
      const key = `${id}.jpg`;
      queue.push({ file: f, key });
      added.push({ file: key, id, alt: "", caption: "", thumb: URL.createObjectURL(f), state: "uploading" });
    }
    setPhotos((list) => [...list, ...added]);
    // Two at a time: quick, but gentle on phone connections.
    const run = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const r = await uploadPhoto("gallery", effectiveSlug, job.file, job.key, 2400);
        if (r.ok) {
          setFresh((m) => ({ ...m, [job!.key]: { entry: r.entry as Entry, blobs: r.blobs as Array<{ path: string; blob: string }> } }));
          patch(job.key, { state: "ready", blur: (r.entry as Entry).blur });
        } else patch(job.key, { state: "error", error: r.message });
      }
    };
    await Promise.all([run(), run()]);
  }

  function move(i: number, d: -1 | 1) {
    setPhotos((list) => {
      const next = [...list];
      const j = i + d;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const uploading = photos.some((p) => p.state === "uploading");
  const missingAlt = photos.filter((p) => p.state === "ready" && !p.alt.trim()).length;

  function build(draft: boolean) {
    if (!title.trim()) return "Add the album title.";
    if (!effectiveSlug) return "Add a web address.";
    if (uploading) return "Wait for the photos to finish uploading.";
    const ready = photos.filter((p) => p.state === "ready");
    if (!ready.length) return "Add at least one photo.";
    if (missingAlt) return `Describe every photo before saving (${missingAlt} still empty). Tip: use “Fill empty descriptions”.`;
    const newPhotos = Object.fromEntries(Object.entries(fresh).filter(([k]) => ready.some((p) => p.file === k)));
    return {
      mode: isNew ? "create" : "edit",
      slug: effectiveSlug,
      album: {
        title,
        date,
        city,
        description,
        cover: ready.some((p) => p.file === cover) ? cover : undefined,
        draft,
        photos: ready.map((p) => ({ file: p.file, alt: p.alt.trim(), caption: p.caption })),
      },
      newPhotos,
    };
  }

  return (
    <div className={s.form}>
      <Section title="Album">
        <TextInput label="Title" value={title} onChange={setTitle} maxLength={100} placeholder="e.g. Pune Open 2026" />
        <SlugField value={effectiveSlug} onChange={(v) => (setSlugTouched(true), setSlug(v))} prefix="/gallery/" locked={!isNew} title={title} />
        <div className={s.cols}>
          <TextInput label="Date" type="date" value={date} onChange={setDate} help="When the photos were taken." />
          <TextInput label="City" optional value={city} onChange={setCity} placeholder="e.g. Pune" />
        </div>
        <TextArea label="About this album" optional value={description} onChange={setDescription} rows={2} help="One or two sentences about the event." />
      </Section>

      <Section
        title={`Photos (${photos.length})`}
        hint="Add as many as you like — they are resized for the web automatically and hidden details like GPS location are removed. Use the arrows to change the order; the ★ photo is the album cover."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => fileRef.current?.click()}>
            + Add photos
          </button>
          <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
          {uploading && <span className={s.help} style={{ alignSelf: "center" }}>Uploading {photos.filter((p) => p.state === "uploading").length} photo(s)… keep this page open.</span>}
        </div>

        {missingAlt > 0 && (
          <div className={s.cols} style={{ alignItems: "end" }}>
            <TextInput label={`Fill empty descriptions (${missingAlt})`} value={fill} onChange={setFill} placeholder="e.g. Players at the Pune Open 2026" help="Every photo needs a short description for people using screen readers." />
            <div>
              <button type="button" className={s.btn} disabled={!fill.trim()} onClick={() => setPhotos((list) => list.map((p) => (p.alt.trim() ? p : { ...p, alt: fill.trim() })))}>
                Fill empty descriptions
              </button>
            </div>
          </div>
        )}

        {photos.length === 0 ? (
          <div className={s.empty}>No photos yet.</div>
        ) : (
          <ul className={s.photos} style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {photos.map((p, i) => {
              const isCover = cover ? cover === p.file : i === 0;
              return (
                <li key={p.file} className={s.photo} data-cover={isCover || undefined}>
                  <div className={s.photoImg} style={p.blur ? { backgroundImage: `url(${p.blur})` } : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.thumb && <img src={p.thumb} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.opacity = "0")} />}
                    <span className={s.photoState}>{p.state === "uploading" ? "Uploading…" : p.state === "error" ? "Failed" : isCover ? "★ Cover" : `#${i + 1}`}</span>
                  </div>
                  {p.state === "error" && <p className={`${s.help} ${s.err}`}>{p.error}</p>}
                  <input className={s.input} placeholder="Describe the photo" aria-label={`Description of photo ${i + 1}`} value={p.alt} onChange={(e) => patch(p.file, { alt: e.target.value })} />
                  <textarea className={s.textarea} placeholder="Caption (optional)" aria-label={`Caption of photo ${i + 1}`} value={p.caption} onChange={(e) => patch(p.file, { caption: e.target.value })} />
                  <div className={s.photoTools}>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">
                      ←
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move later">
                      →
                    </button>
                    <button type="button" onClick={() => setCover(p.file)} disabled={isCover || p.state !== "ready"} aria-label="Make cover">
                      ★
                    </button>
                    <button type="button" onClick={() => setPhotos((list) => list.filter((x) => x.file !== p.file))} aria-label="Remove photo">
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <PublishBar collection="gallery" build={build} isNew={isNew} wasDraft={isDraft}
        onSaved={(_slug, draft) => (setIsNew(false), setSlugTouched(true), setSlug(effectiveSlug), setIsDraft(draft))} publicPath={(sl) => `/gallery/${sl}`} editPath={(sl) => `/admin/gallery/${sl}`} />
    </div>
  );
}
