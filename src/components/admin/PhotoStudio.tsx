"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildPrompt, CHECKS, FIXES, FRAME, OUTFITS, outfitById, STUDIO_HANDOFF, type Gender, type StudioHandoff } from "@/lib/admin/studio";
import { PlayerCard } from "@/components/players/PlayerCard";
import { api } from "./client";
import { BACKDROPS, compose, cutOut, toWebp, type Backdrop, type Cutout } from "./cutout";
import { Choice, Field, Section, Toggle } from "./fields";
import s from "./admin.module.css";
import st from "./studio.module.css";

export interface StudioPlayer {
  slug: string;
  name: string;
  gender?: Gender;
  photo?: string;
}


function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`${s.btn} ${s.small}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Older browsers: fall back to a hidden text box.
          const t = document.createElement("textarea");
          t.value = text;
          document.body.append(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function PhotoStudio({ players, initialSlug }: { players: StudioPlayer[]; initialSlug?: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(players.some((p) => p.slug === initialSlug) ? initialSlug! : "");
  const player = players.find((p) => p.slug === slug);
  const [gender, setGender] = useState<Gender>(player?.gender ?? "female");
  const [outfitId, setOutfitId] = useState("black-polo");
  const [represented, setRepresented] = useState(false);
  const outfit = outfitById(outfitId)!;
  const prompt = useMemo(() => buildPrompt({ outfit, gender }), [outfit, gender]);
  const promptReady = !outfit.national || represented;

  // Card photo maker
  const [cut, setCut] = useState<Cutout | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [backdrop, setBackdrop] = useState<Backdrop>("studio");
  const [adjust, setAdjust] = useState({ zoom: 1, x: 0, y: 0 });
  const [preview, setPreview] = useState<string>();
  const [original, setOriginal] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState("");
  const out = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPlayer(v: string) {
    setSlug(v);
    const p = players.find((x) => x.slug === v);
    if (p?.gender) setGender(p.gender);
    setRepresented(false);
  }

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

  // Repaint whenever the framing or backdrop changes; the preview updates a moment later.
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
    const q = new URLSearchParams({ collection: "players", slug: player.slug, name: `${player.slug}-studio.webp` });
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
      <Section title="1 · Build the prompt" hint="Pick the player and the outfit. The prompt below is written for exactly this job: keep the person 100% the same and make a front-facing studio photo framed for the player card.">
        <div className={s.cols}>
          <Field label="Player" optional help="Used for Women/Men and for “Use for this player” in step 3.">
            <select className={s.input} value={slug} onChange={(e) => pickPlayer(e.target.value)}>
              <option value="">— Choose a player —</option>
              {players.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Choice<Gender>
            label="Outfit cut"
            value={gender}
            onChange={setGender}
            options={[
              { value: "female", label: "Women" },
              { value: "male", label: "Men" },
            ]}
          />
        </div>

        <fieldset className={st.outfits}>
          <legend className={s.label}>Outfit</legend>
          {OUTFITS.map((o) => (
            <label key={o.id} className={st.outfit} data-on={o.id === outfitId || undefined}>
              <input type="radio" name="outfit" value={o.id} checked={o.id === outfitId} onChange={() => (setOutfitId(o.id), setRepresented(false))} />
              {o.reference ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.reference} alt="" />
              ) : (
                <span className={st.swatch} data-outfit={o.id} aria-hidden="true" />
              )}
              <b>{o.label}</b>
              <small>{o.note}</small>
              {!o.reference && o.id !== "own" && <small className={st.tag}>Reference photo not added yet</small>}
            </label>
          ))}
        </fieldset>

        {outfit.national && (
          <div className={st.gate}>
            <Toggle
              label={`${player ? player.name : "This player"} has represented India`}
              help="India outfits are only for players who have played for India. Tick this to show the prompt."
              checked={represented}
              onChange={setRepresented}
            />
          </div>
        )}

        {promptReady ? (
          <div className={st.promptBox}>
            <div className={st.promptHead}>
              <span className={s.label}>Prompt</span>
              <CopyButton text={prompt} label="Copy prompt" />
            </div>
            <textarea className={st.prompt} readOnly value={prompt} rows={14} aria-label="Prompt" onFocus={(e) => e.currentTarget.select()} />
            {outfit.reference && (
              <p className={s.help}>
                This prompt uses the outfit photo as IMAGE 2.{" "}
                <a href={outfit.reference} download className={st.link}>
                  Download the outfit photo
                </a>{" "}
                and attach it after the player&apos;s photo.
              </p>
            )}
          </div>
        ) : (
          <p className={s.help}>Tick the box above to show the prompt.</p>
        )}
      </Section>

      <Section title="2 · Make the photo (free)" hint="Use the free Gemini app (or ChatGPT). Nothing is paid for.">
        <ol className={st.steps}>
          <li>
            Open <b>Gemini</b> (gemini.google.com or the app) and start a new chat.
          </li>
          <li>
            Attach the player&apos;s photo first{outfit.reference ? ", then the outfit photo" : ""}. The clearer and closer the face, the better the result.
          </li>
          <li>Paste the prompt and send. Download the image it makes.</li>
          <li>If something is off, send one of the fixes below in the same chat, then download the better one.</li>
        </ol>
        <div className={st.fixes}>
          {FIXES.map((f) => (
            <div key={f.id} className={st.fix}>
              <span>{f.label}</span>
              <CopyButton text={f.text} label="Copy fix" />
            </div>
          ))}
        </div>
        <div className={st.checks}>
          <span className={s.label}>Before you use it, check:</span>
          <ul>
            {CHECKS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className={s.help}>If the face is not right after two or three fixes, start a new chat — never use a photo that does not look like the player.</p>
        </div>
      </Section>

      <Section title="3 · Card photo maker" hint={`Upload the photo from step 2 (or any good portrait). The background is removed on this device — the photo is not sent anywhere — and it is framed exactly for the player card (${FRAME.width} × ${FRAME.height}).`}>
        <div>
          <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => fileRef.current?.click()} disabled={!!status}>
            {cut ? "Choose another photo" : "Choose photo"}
          </button>
          <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => (load(e.target.files?.[0]), (e.target.value = ""))} />
        </div>
        {status && <p className={s.help} role="status">{status}</p>}
        {error && <p className={`${s.help} ${s.err}`}>{error}</p>}

        <div className={st.maker} hidden={!cut}>
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
                  player={{ slug: slug || "preview", name: player?.name ?? "Player Name", medals: {}, photo: { src: preview, alt: "", width: FRAME.width, height: FRAME.height } }}
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

          <div className={st.controls}>
            <Choice<Backdrop> label="Background" value={backdrop} onChange={setBackdrop} options={BACKDROPS.map((b) => ({ value: b.id, label: b.label }))} />
            <div className={st.sliders}>
              {slider("zoom", "Size", 0.6, 1.6, 0.01)}
              {slider("x", "Left / right", -0.25, 0.25, 0.005)}
              {slider("y", "Up / down", -0.25, 0.25, 0.005)}
              <button type="button" className={`${s.btn} ${s.small}`} onClick={() => setAdjust({ zoom: 1, x: 0, y: 0 })}>
                Reset framing
              </button>
            </div>
          </div>

          <Toggle label="I compared it with the original: same person, same skin tone" checked={checked} onChange={setChecked} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className={s.btn} onClick={download}>
              Download
            </button>
            <button type="button" className={`${s.btn} ${s.primary}`} disabled={!checked || !player || !!saving} onClick={use} title={!player ? "Choose the player in step 1 first" : undefined}>
              {saving || (player ? `Use for ${player.name}` : "Use for this player")}
            </button>
          </div>
          {!player && <p className={s.help}>Choose the player in step 1 to put this photo on their card.</p>}
        </div>
      </Section>
    </div>
  );
}
