"use client";

import { useEffect, useRef, useState } from "react";
import { BACKDROPS, compose, cutOut, toWebp, type Backdrop, type Cutout } from "./cutout";
import { api, uploadPhoto } from "./client";
import { TextInput, type ImageValue, type Upload } from "./fields";
import s from "./admin.module.css";

type Card = "state" | "national" | "international";

/** The background each card design gets by default. */
const DEFAULT_BACKDROP: Record<Card, Backdrop> = { national: "black", state: "black", international: "green" };

/**
 * A player's card photo, made automatically: the uploaded portrait has its
 * background removed on this device and is framed for the card on the
 * backdrop that suits the player's card (Black studio for National and
 * State, Green studio for International). Another backdrop, or the original
 * photo, can be picked. Uploaded straight away; live with the next Publish.
 */
export function CardPhotoField({
  label,
  value,
  onChange,
  onUploaded,
  slug,
  card,
  help,
}: {
  label: string;
  value?: ImageValue;
  onChange: (v: ImageValue | undefined) => void;
  onUploaded: (u: Upload) => void;
  slug: string;
  card: Card;
  help?: string;
}) {
  const [cut, setCut] = useState<Cutout | null>(null);
  const [file, setFile] = useState<File>();
  const [backdrop, setBackdrop] = useState<Backdrop>(DEFAULT_BACKDROP[card]);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const run = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const alt = useRef(value?.alt ?? "");
  alt.current = value?.alt ?? alt.current;

  // The card type changed and no background was picked by hand: follow it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the card type until chosen by hand
    if (!touched) setBackdrop(DEFAULT_BACKDROP[card]);
  }, [card, touched]);

  async function pick(f?: File) {
    if (!f) return;
    setError("");
    if (!slug) return setError("Add the player's name first (it sets the web address the photo is stored under).");
    setFile(f);
    setCut(null);
    setPreview(URL.createObjectURL(f));
    setStatus("Removing the background…");
    try {
      const c = await cutOut(f, (share) => setStatus(`Getting the background remover ready (first time only)… ${Math.round(share * 100)}%`));
      setCut(c);
    } catch {
      setStatus("");
      setError("Couldn't remove the background automatically, so the original photo is used. You can try the Card Maker.");
      setBackdrop("original");
      setTouched(true);
    }
  }

  // Compose and upload whenever the photo or background changes.
  useEffect(() => {
    if (!file) return;
    const id = ++run.current;
    (async () => {
      try {
        let r;
        if (backdrop === "original" || !cut) {
          if (backdrop !== "original") return; // still cutting out
          setStatus("Uploading the original photo…");
          r = await uploadPhoto("players", slug, file, file.name, 2400);
        } else {
          const c = canvasRef.current!;
          compose(c, cut, backdrop, { zoom: 1, x: 0, y: 0 });
          setPreview(c.toDataURL("image/webp", 0.85));
          setStatus("Uploading the card photo…");
          const blob = await toWebp(c);
          const q = new URLSearchParams({ collection: "players", slug, name: `${slug}-card.webp` });
          r = await api("POST", `/api/admin/upload?${q}`, blob);
        }
        if (id !== run.current) return;
        if (!r.ok) throw new Error(r.message ?? "Upload failed.");
        onUploaded({ path: r.path as string, blob: r.blob as string });
        onChange({ src: r.src as string, width: r.width as number, height: r.height as number, alt: alt.current });
        setStatus("");
      } catch (e) {
        if (id !== run.current) return;
        setStatus("");
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per photo/background
  }, [file, cut, backdrop]);

  const shown = preview || value?.src;
  return (
    <div className={s.field}>
      <span className={s.label}>
        {label}
        <span className={s.optional}>optional</span>
      </span>
      <div className={s.imageBox}>
        <label className={s.drop} style={{ aspectRatio: "4 / 5" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shown && <img src={shown} alt="" />}
          <span style={{ position: "relative", padding: 12, background: shown ? "rgb(0 0 0 / 0.55)" : undefined, borderRadius: 8 }}>{status ? "Working…" : value ? "Replace photo" : "Choose a photo"}</span>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={!!status} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} aria-label={label} />
        </label>
        <div className={s.form} style={{ gap: 14 }}>
          <p className={s.help}>
            {help ??
              "Upload a clear front-facing portrait. The background is removed on this device and replaced with the card's studio background (Black for National and State cards, Green for International). The face and skin tone are not changed."}
          </p>
          {file && (
            <div className={s.choice} role="radiogroup" aria-label="Background">
              {BACKDROPS.map((b) => (
                <label key={b.id}>
                  <input type="radio" name={`bg-${label}`} checked={backdrop === b.id} disabled={!!status} onChange={() => (setTouched(true), setBackdrop(b.id))} />
                  <span>{b.id === "original" ? "Keep original photo" : b.label}</span>
                </label>
              ))}
            </div>
          )}
          {value && (
            <>
              <TextInput label="Describe the photo" help="A short description for people using screen readers." value={value.alt} onChange={(a) => onChange({ ...value, alt: a })} />
              <div>
                <button type="button" className={`${s.btn} ${s.small} ${s.danger}`} onClick={() => (setFile(undefined), setCut(null), setPreview(undefined), onChange(undefined))}>
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
      <canvas ref={canvasRef} hidden />
    </div>
  );
}
