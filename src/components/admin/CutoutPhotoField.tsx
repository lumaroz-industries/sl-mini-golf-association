"use client";

import { useState } from "react";
import { cutOut, cutoutImage, toWebp } from "./cutout";
import { api, uploadPhoto } from "./client";
import { TextInput, type ImageValue, type Upload } from "./fields";
import s from "./admin.module.css";

/**
 * A photo that becomes a cut-out automatically: the background is removed on
 * this device and the person is saved on a transparent background, so they
 * stand on the card itself. Falls back to the original photo if the cut-out
 * fails. Uploaded straight away; live with the next Publish.
 */
export function CutoutPhotoField({
  label,
  value,
  onChange,
  onUploaded,
  collection,
  slug,
}: {
  label: string;
  value?: ImageValue;
  onChange: (v: ImageValue | undefined) => void;
  onUploaded: (u: Upload) => void;
  collection: "officials" | "players";
  slug: string;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>();

  async function pick(file?: File) {
    if (!file) return;
    setError("");
    if (!slug) return setError("Add the name first (it sets the web address the photo is stored under).");
    setStatus("Removing the background…");
    try {
      let r;
      try {
        const cut = await cutOut(file, (share) => setStatus(`Getting the background remover ready (first time only)… ${Math.round(share * 100)}%`));
        const c = cutoutImage(cut);
        setPreview(c.toDataURL("image/webp", 0.85));
        setStatus("Uploading the cut-out…");
        const blob = await toWebp(c);
        const q = new URLSearchParams({ collection, slug, name: `${slug}-cutout.webp` });
        r = await api("POST", `/api/admin/upload?${q}`, blob);
      } catch {
        setError("Couldn't remove the background automatically, so the original photo is used.");
        setPreview(URL.createObjectURL(file));
        setStatus("Uploading the photo…");
        r = await uploadPhoto(collection, slug, file, file.name, 2400);
      }
      if (!r.ok) throw new Error(r.message ?? "Upload failed.");
      onUploaded({ path: r.path as string, blob: r.blob as string });
      onChange({ src: r.src as string, width: r.width as number, height: r.height as number, alt: value?.alt ?? "" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStatus("");
    }
  }

  const shown = preview || value?.src;
  return (
    <div className={s.field}>
      <span className={s.label}>
        {label}
        <span className={s.optional}>optional</span>
      </span>
      <div className={s.imageBox}>
        <label
          className={s.drop}
          style={{ aspectRatio: "4 / 5", background: "repeating-conic-gradient(#141414 0 25%, #0b0b0b 0 50%) 0 0 / 18px 18px" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shown && <img src={shown} alt="" style={{ objectFit: "contain", objectPosition: "50% 100%" }} />}
          <span style={{ position: "relative", padding: 12, background: shown ? "rgb(0 0 0 / 0.55)" : undefined, borderRadius: 8 }}>{status ? "Working…" : value ? "Replace photo" : "Choose a photo"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!status} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} aria-label={label} />
        </label>
        <div className={s.form} style={{ gap: 14 }}>
          <p className={s.help}>Upload a clear portrait (head and shoulders or half-length). The background is removed on this device and the person is placed on the card, like the people on the Social Media page.</p>
          {value && (
            <>
              <TextInput label="Describe the photo" help="A short description for people using screen readers." value={value.alt} onChange={(a) => onChange({ ...value, alt: a })} />
              <div>
                <button type="button" className={`${s.btn} ${s.small} ${s.danger}`} onClick={() => (setPreview(undefined), onChange(undefined))}>
                  Remove photo
                </button>
              </div>
            </>
          )}
          {status && (
            <p className={s.help} role="status">
              {status}
            </p>
          )}
          {error && <p className={`${s.help} ${s.err}`}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
