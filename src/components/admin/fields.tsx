"use client";

import { useId, useRef, useState } from "react";
import { slugify } from "@/lib/admin/shared";
import { uploadPhoto } from "./client";
import s from "./admin.module.css";

/* ------------------------------------------------------------------ basics */

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {hint && <p className={s.sectionHint}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, help, optional, children, id }: { label: string; help?: React.ReactNode; optional?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
        {optional && <span className={s.optional}>optional</span>}
      </label>
      {children}
      {help && <p className={s.help}>{help}</p>}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onChange: (v: string) => void };

export function TextInput({ label, help, optional, value, onChange, ...rest }: InputProps & { label: string; help?: React.ReactNode; optional?: boolean }) {
  const id = useId();
  return (
    <Field label={label} help={help} optional={optional} id={id}>
      <input id={id} className={s.input} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function TextArea({ label, help, optional, value, onChange, rows = 3, maxLength }: { label: string; help?: React.ReactNode; optional?: boolean; value: string; onChange: (v: string) => void; rows?: number; maxLength?: number }) {
  const id = useId();
  return (
    <Field label={label} optional={optional} id={id} help={<>{help} {maxLength ? <span>({value.length}/{maxLength})</span> : null}</>}>
      <textarea id={id} className={s.textarea} rows={rows} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function Choice<T extends string>({ label, help, value, onChange, options }: { label: string; help?: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  const name = useId();
  return (
    <fieldset className={s.field} style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={s.label} style={{ marginBottom: 7 }}>
        {label}
      </legend>
      <div className={s.choice}>
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {help && <p className={s.help}>{help}</p>}
    </fieldset>
  );
}

export function Toggle({ label, help, checked, onChange }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={s.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className={s.label}>{label}</span>
        {help && <span className={s.help} style={{ display: "block", marginTop: 3 }}>{help}</span>}
      </span>
    </label>
  );
}

/** The web address of a new item; fixed once published so links never break. */
export function SlugField({ value, onChange, prefix, locked, title }: { value: string; onChange: (v: string) => void; prefix: string; locked: boolean; title: string }) {
  const id = useId();
  return (
    <Field
      label="Web address"
      id={id}
      help={locked ? "The web address can't change after publishing, so shared links keep working." : "Filled in from the title. Lowercase letters, numbers and hyphens only. It can't be changed later."}
    >
      <div className={s.slugRow}>
        <span className={s.slugPrefix}>{prefix}</span>
        <input
          id={id}
          className={s.input}
          value={value}
          readOnly={locked}
          placeholder={slugify(title) || "my-page"}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
        />
      </div>
    </Field>
  );
}

export function Issues({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className={s.issues} role="alert">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------- image */

export interface ImageValue {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit?: string;
}

export interface Upload {
  path: string;
  blob: string;
}

/**
 * One photo with its description: shrinks it in the browser, uploads it and
 * keeps it ready for the next Publish.
 */
export function ImageField({
  label,
  help,
  value,
  onChange,
  onUploaded,
  collection,
  slug,
  withCredit = true,
  previewSrc,
}: {
  label: string;
  help?: string;
  value?: ImageValue;
  onChange: (v: ImageValue | undefined) => void;
  onUploaded: (u: Upload) => void;
  collection: "updates" | "articles" | "players";
  slug: string;
  withCredit?: boolean;
  /** Local preview for a photo uploaded elsewhere (not live until Publish). */
  previewSrc?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>();
  const [over, setOver] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setError("");
    if (!slug) return setError("Add a title first (it sets the web address the photo is stored under).");
    setBusy(true);
    try {
      const r = await uploadPhoto(collection, slug, file, file.name, 2400);
      if (!r.ok) throw new Error(r.message);
      setPreview(URL.createObjectURL(file));
      onUploaded({ path: r.path as string, blob: r.blob as string });
      onChange({ src: r.src as string, width: r.width as number, height: r.height as number, alt: value?.alt ?? "", credit: value?.credit });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.field}>
      <span className={s.label}>
        {label}
        <span className={s.optional}>optional</span>
      </span>
      <div className={s.imageBox}>
        <label
          className={s.drop}
          data-over={over || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files[0]);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(preview || previewSrc || value?.src) && <img src={preview || previewSrc || value?.src} alt="" />}
          <span style={{ position: "relative", padding: 12, background: value ? "rgb(0 0 0 / 0.55)" : undefined, borderRadius: 8 }}>
            {busy ? "Uploading…" : value ? "Replace photo" : "Choose or drop a photo"}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={busy} onChange={(e) => pick(e.target.files?.[0] ?? undefined)} aria-label={label} />
        </label>
        <div className={s.form} style={{ gap: 14 }}>
          {value ? (
            <>
              <TextInput label="Describe the photo" help="A short description for people using screen readers, e.g. “Players lining up a putt at the Pune Open”." value={value.alt} onChange={(alt) => onChange({ ...value, alt })} />
              {withCredit && <TextInput label="Photo credit" optional value={value.credit ?? ""} onChange={(credit) => onChange({ ...value, credit })} />}
              <div>
                <button type="button" className={`${s.btn} ${s.small} ${s.danger}`} onClick={() => (setPreview(undefined), onChange(undefined))}>
                  Remove photo
                </button>
              </div>
            </>
          ) : (
            <p className={s.help}>{help ?? "JPG, PNG or WebP. Large photos are resized automatically and hidden details (like GPS location) are removed."}</p>
          )}
          {error && <p className={`${s.help} ${s.err}`}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- markdown */

/**
 * A writing box with formatting buttons. Writes the same Markdown the site's
 * articles use, so headings, photos, galleries, quotes and videos all work.
 */
export function MarkdownField({
  label,
  help,
  value,
  onChange,
  collection,
  slug,
  onUploaded,
  preview,
  rows = 18,
}: {
  label: string;
  help?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  collection: "updates" | "articles";
  slug: string;
  onUploaded: (u: Upload) => void;
  preview: (markdown: string) => Promise<React.ReactNode>;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [rendered, setRendered] = useState<React.ReactNode>(null);
  const [status, setStatus] = useState("");
  const id = useId();

  /** Wrap the selection, or insert a block on its own lines. */
  function edit(fn: (sel: string) => { text: string; block?: boolean; select?: [number, number] }) {
    const el = ref.current;
    if (!el) return;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    const r = fn(value.slice(a, b));
    const before = value.slice(0, a);
    const after = value.slice(b);
    let pre = "";
    let post = "";
    if (r.block) {
      if (before && !before.endsWith("\n\n")) pre = before.endsWith("\n") ? "\n" : "\n\n";
      if (!after.startsWith("\n\n")) post = after.startsWith("\n") ? "\n" : after ? "\n\n" : "\n";
    }
    onChange(before + pre + r.text + post + after);
    const base = before.length + pre.length;
    const [s0, s1] = r.select ?? [r.text.length, r.text.length];
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(base + s0, base + s1);
    });
  }

  const linePrefix = (prefix: (i: number) => string) =>
    edit((sel) => ({
      text: (sel || "Text")
        .split("\n")
        .map((l, i) => prefix(i) + l)
        .join("\n"),
      block: true,
    }));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    if (!slug) return setStatus("Add a title first (it sets the web address photos are stored under).");
    const imgs: string[] = [];
    for (const [i, file] of [...files].entries()) {
      setStatus(`Uploading photo ${i + 1} of ${files.length}…`);
      const r = await uploadPhoto(collection, slug, file, file.name, 2400);
      if (!r.ok) {
        setStatus(r.message ?? "Upload failed.");
        return;
      }
      onUploaded({ path: r.path as string, blob: r.blob as string });
      imgs.push(`![Describe this photo](${r.src as string}${files.length === 1 ? ' "Caption (optional) — delete this text if you don’t want one"' : ""})`);
    }
    setStatus(files.length === 1 ? "Photo added — replace “Describe this photo” with a short description." : "Gallery added — replace each “Describe this photo” with a short description.");
    edit(() => ({ text: imgs.join(" "), block: true }));
  }

  async function showPreview() {
    setMode("preview");
    setRendered(<p className={s.help}>Loading preview…</p>);
    try {
      setRendered(await preview(value));
    } catch {
      setRendered(<p className={s.err}>The preview could not load.</p>);
    }
  }

  const tools: Array<[string, string, () => void] | "|"> = [
    ["H2", "Heading", () => edit((t) => ({ text: `## ${t || "Heading"}`, block: true }))],
    ["H3", "Smaller heading", () => edit((t) => ({ text: `### ${t || "Smaller heading"}`, block: true }))],
    "|",
    ["B", "Bold", () => edit((t) => ({ text: `**${t || "bold text"}**`, select: [2, 2 + (t || "bold text").length] }))],
    ["I", "Italic", () => edit((t) => ({ text: `*${t || "italic text"}*`, select: [1, 1 + (t || "italic text").length] }))],
    ["Link", "Link", () => edit((t) => ({ text: `[${t || "link text"}](https://)`, select: [(t || "link text").length + 3, (t || "link text").length + 11] }))],
    "|",
    ["• List", "Bullet list", () => linePrefix(() => "- ")],
    ["1. List", "Numbered list", () => linePrefix((i) => `${i + 1}. `)],
    ["“ Quote", "Quote", () => linePrefix(() => "> ")],
    "|",
    ["Photo", "Add photos (several at once make a gallery)", () => fileRef.current?.click()],
    ["Video", "YouTube or Instagram link", () => edit(() => ({ text: "https://www.youtube.com/watch?v=VIDEO_ID", block: true }))],
  ];

  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <div>
        <div className={s.toolbar} role="toolbar" aria-label="Formatting">
          {tools.map((t, i) =>
            t === "|" ? (
              <span key={i} className={s.toolSep} />
            ) : (
              <button key={t[0]} type="button" className={s.tool} title={t[1]} aria-label={t[1]} disabled={mode === "preview"} onClick={t[2]}>
                {t[0]}
              </button>
            ),
          )}
          <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button type="button" className={s.tool} aria-pressed={mode === "write"} onClick={() => setMode("write")}>
              Write
            </button>
            <button type="button" className={s.tool} aria-pressed={mode === "preview"} onClick={showPreview}>
              Preview
            </button>
          </span>
        </div>
        {mode === "write" ? (
          <textarea id={id} ref={ref} className={`${s.textarea} ${s.editor}`} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <div className={s.preview}>{rendered}</div>
        )}
        <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => (addPhotos(e.target.files), (e.target.value = ""))} />
      </div>
      {status && <p className={s.help} role="status">{status}</p>}
      {help && <div className={s.help}>{help}</div>}
    </div>
  );
}
