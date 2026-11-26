"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FRAME, STUDIO_HANDOFF, type StudioHandoff } from "@/lib/admin/studio";
import { PlayerCard } from "@/components/players/PlayerCard";
import { api } from "./client";
import { BACKDROPS, compose, cutOut, toWebp, type Backdrop, type Cutout } from "./cutout";
import { Choice, Field, Section, Toggle } from "./fields";
import s from "./admin.module.css";
import st from "./studio.module.css";

export interface MakerPlayer {
  slug: string;
  name: string;
  photo?: string;
  card?: "state" | "national" | "international";
}

/**
 * Card Maker: any portrait in, a finished player-card photo out. The
 * background is removed on this device (the photo is not sent anywhere),
 * the person is placed on a studio backdrop — green smoke like the
 * photographer's backdrop, black, gold spotlight or the original — framed the
 * same way every time (960 × 1200), previewed on the player's own card, and
 * then downloaded or put straight onto the player.
 */
export function CardMaker({ players, initialSlug }: { players: MakerPlayer[]; initialSlug?: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(players.some((p) => p.slug === initialSlug) ? initialSlug! : "");
  const player = players.find((p) => p.slug === slug);
  const [cut, setCut] = useState<Cutout | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [backdrop, setBackdrop] = useState<Backdrop>("green");
  const [adjust, setAdjust] = useState({ zoom: 1, x: 0, y: 0 });
  const [preview, setPreview] = useState<string>();
  const [original, setOriginal] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState("");
  const out = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(file?: File) {
    if (!file) return;
    setError("");
    setCut(null);
    setChecked(false);
    setAdjust({ zoom: 1, x: 0, y: 0 });
    setOriginal((old) => (old && URL.revokeObjectURL(old), URL.createObjectURL(file)));
    setStatus("Getting the cut-out engine ready…");
    try {
      const c = await cutOut(file, (share) => setStatus(`Downloading the cut-out engine (first time only)… ${Math.round(share * 100)}%`));
      setCut(c);
      setStatus("");
    } catch (e) {
      setStatus("");
      setError((e as Error).message || "Something went wrong while cutting out the photo.");
    }
  }

  // Repaint whenever the framing or backdrop changes; the card preview follows a moment later.
  useEffect(() => {
    if (!cut || !out.current) return;
    compose(out.current, cut, backdrop, adjust);
    const c = out.current;
    const t = setTimeout(() => setPreview(c.toDataURL("image/webp", 0.85)), 120);
    return () => clearTimeout(t);
  }, [cut, backdrop, adjust]);

  async function download() {
    if (!out.current) return;
    const blob = await toWebp(out.current);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "player"}-card-photo.webp`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function use() {
    if (!out.current || !player) return;
    setSaving("Uploading…");
    setError("");
    const blob = await toWebp(out.current);
    const q = new URLSearchParams({ collection: "players", slug: player.slug, name: `${player.slug}-card.webp` });
    const r = await api("POST", `/api/admin/upload?${q}`, blob);
    if (!r.ok) {
      setSaving("");
      setError(r.message ?? "Upload failed.");
      return;
    }
    const handoff: StudioHandoff = {
      slug: player.slug,
      preview: out.current.toDataURL("image/webp", 0.85),
      photo: { src: r.src as string, width: r.width as number, height: r.height as number, alt: `${player.name}, studio portrait` },
      upload: { path: r.path as string, blob: r.blob as string },
    };
    try {
      sessionStorage.setItem(STUDIO_HANDOFF, JSON.stringify(handoff));
    } catch {
      setSaving("");
      setError("Your browser blocked saving the photo for the next page. Use Download instead and add it in the player's editor.");
      return;
    }
    router.push(`/admin/players/${player.slug}?photo=studio`);
  }

  const slider = (key: "zoom" | "x" | "y", label: string, min: number, max: number, step: number) => (
    <label className={st.slider}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={adjust[key]} onChange={(e) => setAdjust((a) => ({ ...a, [key]: Number(e.target.value) }))} />
    </label>
  );

  return (
    <div className={s.form}>
      <Section title="Photo" hint={`Choose the player and upload a clear portrait (front-facing, head and shoulders). The background is removed on this device — the photo is not sent anywhere — and the person is framed for the card (${FRAME.width} × ${FRAME.height}).`}>
        <div className={s.cols}>
          <Field label="Player" optional help="Needed for “Use for this player”; also shows the preview on their own card design.">
            <select className={s.input} value={slug} onChange={(e) => setSlug(e.target.value)}>
              <option value="">— Choose a player —</option>
              {players.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ alignSelf: "end" }}>
            <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => fileRef.current?.click()} disabled={!!status}>
              {cut ? "Choose another photo" : "Upload photo"}
            </button>
            <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => (load(e.target.files?.[0]), (e.target.value = ""))} />
          </div>
        </div>
        {status && <p className={s.help} role="status">{status}</p>}
        {error && <p className={`${s.help} ${s.err}`}>{error}</p>}
      </Section>

      <div className={st.maker} hidden={!cut}>
        <Section title="Card photo" hint="Pick the background, adjust the framing if needed, and compare with the original.">
          <Choice<Backdrop> label="Background" value={backdrop} onChange={setBackdrop} options={BACKDROPS.map((b) => ({ value: b.id, label: b.label }))} />
          <div className={st.views}>
            <figure>
              <canvas ref={out} className={st.canvas} />
              <figcaption>Card photo</figcaption>
            </figure>
            <figure className={st.cardPreview}>
              {preview && (
                <PlayerCard
                  revealLabel="Reveal soon"
                  badge="Preview"
                  arrowHidden
                  player={{ slug: slug || "preview", name: player?.name ?? "Player Name", medals: {}, card: player?.card, photo: { src: preview, alt: "", width: FRAME.width, height: FRAME.height } }}
                />
              )}
              <figcaption>On the card</figcaption>
            </figure>
            {original && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={original} alt="" className={st.canvas} />
                <figcaption>Original — compare the face</figcaption>
              </figure>
            )}
          </div>

          {cut && !cut.frame.confident && <p className={`${s.help} ${s.err}`}>Couldn&apos;t find the head precisely — check the framing and adjust it with the sliders.</p>}

          <div className={st.sliders}>
            {slider("zoom", "Size", 0.6, 1.6, 0.01)}
            {slider("x", "Left / right", -0.25, 0.25, 0.005)}
            {slider("y", "Up / down", -0.25, 0.25, 0.005)}
            <button type="button" className={`${s.btn} ${s.small}`} onClick={() => setAdjust({ zoom: 1, x: 0, y: 0 })}>
              Reset framing
            </button>
          </div>

          <Toggle label="I compared it with the original: same person, same skin tone" checked={checked} onChange={setChecked} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className={s.btn} onClick={download}>
              Download
            </button>
            <button type="button" className={`${s.btn} ${s.primary}`} disabled={!checked || !player || !!saving} onClick={use} title={!player ? "Choose the player first" : undefined}>
              {saving || (player ? `Use for ${player.name}` : "Use for this player")}
            </button>
          </div>
          {!player && <p className={s.help}>Choose the player above to put this photo on their card.</p>}
        </Section>
      </div>
    </div>
  );
}
