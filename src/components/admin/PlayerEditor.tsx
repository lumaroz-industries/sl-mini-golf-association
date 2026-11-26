"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STUDIO_HANDOFF, type StudioHandoff } from "@/lib/admin/studio";
import { slugify } from "@/lib/admin/shared";
import { Choice, Field, ImageField, Section, SlugField, TextArea, TextInput, Toggle, type ImageValue, type Upload } from "./fields";
import { PublishBar } from "./PublishBar";
import s from "./admin.module.css";

type Outcome = "gold" | "silver" | "bronze" | "position" | "participated";
interface ResultRow {
  event: string;
  year: string;
  level: string;
  category: string;
  place: string;
  outcome: Outcome;
  position: string;
}

export interface PlayerInitial {
  slug?: string;
  name?: string;
  gender?: "female" | "male";
  district?: string;
  card?: "state" | "national" | "international";
  photo?: ImageValue;
  medals?: { gold?: number; silver?: number; bronze?: number };
  results?: Array<{ event: string; year: number; level: string; category?: string; place?: string; medal?: "gold" | "silver" | "bronze"; position?: number }>;
  bio?: string;
  draft?: boolean;
}

const LEVELS = [
  { value: "international", label: "International" },
  { value: "national", label: "National" },
  { value: "state", label: "State" },
  { value: "district", label: "District" },
];

const toRow = (r: NonNullable<PlayerInitial["results"]>[number]): ResultRow => ({
  event: r.event,
  year: String(r.year),
  level: r.level,
  category: r.category ?? "",
  place: r.place ?? "",
  outcome: r.medal ?? (r.position ? "position" : "participated"),
  position: r.position ? String(r.position) : "",
});

const blankRow = (): ResultRow => ({ event: "", year: String(new Date().getFullYear()), level: "national", category: "", place: "", outcome: "participated", position: "" });
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export function PlayerEditor({ initial, isNew: startsNew }: { initial: PlayerInitial; isNew: boolean }) {
  const [isNew, setIsNew] = useState(startsNew);
  const [isDraft, setIsDraft] = useState(initial.draft ?? true);
  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!startsNew);
  const [gender, setGender] = useState<string>(initial.gender ?? "");
  const [district, setDistrict] = useState(initial.district ?? "");
  const [card, setCard] = useState<"state" | "national" | "international">(initial.card ?? "state");
  const [photo, setPhoto] = useState<ImageValue | undefined>(initial.photo);
  const [manual, setManual] = useState(!!initial.medals);
  const [medals, setMedals] = useState({
    gold: initial.medals?.gold?.toString() ?? "",
    silver: initial.medals?.silver?.toString() ?? "",
    bronze: initial.medals?.bronze?.toString() ?? "",
  });
  const [rows, setRows] = useState<ResultRow[]>((initial.results ?? []).map(toRow));
  const [bio, setBio] = useState(initial.bio ?? "");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [studioPreview, setStudioPreview] = useState<string>();

  // A photo made in the Photo Studio for this player: put it in, ready to publish.
  useEffect(() => {
    let h: StudioHandoff | null = null;
    try {
      h = JSON.parse(sessionStorage.getItem(STUDIO_HANDOFF) ?? "null") as StudioHandoff | null;
      if (h?.slug === initial.slug) sessionStorage.removeItem(STUDIO_HANDOFF);
    } catch {}
    if (!h || h.slug !== initial.slug) return;
    const got = h;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off pick-up from sessionStorage after navigation
    setPhoto(got.photo);
    setUploads((x) => [...x, got.upload]);
    setStudioPreview(got.preview);
  }, [initial.slug]);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const setRow = (i: number, p: Partial<ResultRow>) => setRows((list) => list.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const counted = { gold: 0, silver: 0, bronze: 0 };
  for (const r of rows) if (r.outcome === "gold" || r.outcome === "silver" || r.outcome === "bronze") counted[r.outcome]++;

  function build(draft: boolean) {
    if (!name.trim()) return "Add the player's name.";
    if (!effectiveSlug) return "Add a web address.";
    if (photo && !photo.alt.trim()) return "Describe the photo.";
    for (const [i, r] of rows.entries()) {
      if (!r.event.trim()) return `Result ${i + 1}: add the event name (or remove the row).`;
      if (!/^\d{4}$/.test(r.year)) return `Result ${i + 1}: the year must be four digits, e.g. 2026.`;
      if (r.outcome === "position" && !/^\d+$/.test(r.position)) return `Result ${i + 1}: add the position number.`;
    }
    return {
      mode: isNew ? "create" : "edit",
      uploads,
      data: {
        slug: effectiveSlug,
        name,
        gender: gender || undefined,
        district,
        card: card === "state" ? undefined : card,
        photo: photo ? { src: photo.src, alt: photo.alt, width: photo.width, height: photo.height } : undefined,
        medals: manual ? { gold: num(medals.gold), silver: num(medals.silver), bronze: num(medals.bronze) } : undefined,
        results: rows.map((r) => ({
          event: r.event,
          year: Number(r.year),
          level: r.level,
          category: r.category,
          place: r.place,
          medal: r.outcome === "gold" || r.outcome === "silver" || r.outcome === "bronze" ? r.outcome : undefined,
          position: r.outcome === "position" ? Number(r.position) : undefined,
        })),
        bio,
        draft,
      },
    };
  }

  return (
    <div className={s.form}>
      <Section title="Player">
        <TextInput label="Full name" value={name} onChange={setName} maxLength={60} placeholder="e.g. Pranjali Surduse" />
        <SlugField value={effectiveSlug} onChange={(v) => (setSlugTouched(true), setSlug(v))} prefix="/players/" locked={!isNew} title={name} />
        <div className={s.cols}>
          <Choice
            label="Category"
            value={gender}
            onChange={setGender}
            options={[
              { value: "female", label: "Women" },
              { value: "male", label: "Men" },
              { value: "", label: "Not set" },
            ]}
          />
          <TextInput label="District" optional value={district} onChange={setDistrict} placeholder="e.g. Nagpur" help="District in Maharashtra — used by the District filter." />
        </div>
      </Section>

      <Section title="Card" hint="Which player card they get on the website. The admins decide — e.g. International for players who have played abroad, National for India-level players.">
        <Choice
          label="Card type"
          value={card}
          onChange={setCard}
          options={[
            { value: "state", label: "State · Maharashtra" },
            { value: "national", label: "National · India" },
            { value: "international", label: "International · Diamond" },
          ]}
        />
      </Section>

      <Section title="Photo" hint="A portrait photo (about 4:5) works best. Without one, the card shows the player's initials.">
        {studioPreview && photo && <p className={`${s.help} ${s.ok}`}>New photo from the Photo Studio — press Publish (or Save draft) to put it on the card.</p>}
        <ImageField label="Photo" value={photo} onChange={(v) => (v?.src !== photo?.src && setStudioPreview(undefined), setPhoto(v))} onUploaded={(u) => setUploads((x) => [...x, u])} collection="players" slug={effectiveSlug} withCredit={false} previewSrc={studioPreview} />
        {!isNew && (
          <p className={s.help}>
            No good photo? <Link href={`/admin/photo-studio?player=${effectiveSlug}`} style={{ color: "var(--gold)", textDecoration: "underline" }}>Make a studio portrait in the Photo Studio</Link>.
          </p>
        )}
      </Section>

      <Section title={`Results (${rows.length})`} hint="Every competition result. These power the Level and Year filters and the player's results list.">
        {rows.length === 0 && <div className={s.empty}>No results yet.</div>}
        {rows.map((r, i) => (
          <div key={i} className={s.section} style={{ padding: 16 }}>
            <div className={s.cols}>
              <TextInput label="Event" value={r.event} onChange={(v) => setRow(i, { event: v })} placeholder="e.g. Minigolf Open Asian Championships" />
              <TextInput label="Year" value={r.year} onChange={(v) => setRow(i, { year: v.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" />
            </div>
            <Choice label="Level" value={r.level} onChange={(v) => setRow(i, { level: v })} options={LEVELS} />
            <div className={s.cols}>
              <TextInput label="Category" optional value={r.category} onChange={(v) => setRow(i, { category: v })} placeholder="e.g. Women's singles, Junior, Team" />
              <TextInput label="Where" optional value={r.place} onChange={(v) => setRow(i, { place: v })} placeholder="e.g. Pran Buri, Thailand" />
            </div>
            <Choice
              label="Result"
              value={r.outcome}
              onChange={(v) => setRow(i, { outcome: v })}
              options={[
                { value: "gold", label: "🥇 Gold" },
                { value: "silver", label: "🥈 Silver" },
                { value: "bronze", label: "🥉 Bronze" },
                { value: "position", label: "Position" },
                { value: "participated", label: "Participated" },
              ]}
            />
            {r.outcome === "position" && <TextInput label="Position" value={r.position} onChange={(v) => setRow(i, { position: v.replace(/\D/g, "") })} inputMode="numeric" placeholder="e.g. 4" />}
            <div>
              <button type="button" className={`${s.btn} ${s.small} ${s.danger}`} onClick={() => setRows((list) => list.filter((_, k) => k !== i))}>
                Remove result
              </button>
            </div>
          </div>
        ))}
        <div>
          <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => setRows((list) => [...list, blankRow()])}>
            + Add result
          </button>
        </div>
      </Section>

      <Section title="Medal totals" hint="Shown on the player's card and in the directory.">
        <Toggle
          label="Enter the totals myself"
          help={manual ? "These numbers are shown instead of counting the results. Leave a box empty if it isn't known." : `Counted from the results above: ${counted.gold} gold, ${counted.silver} silver, ${counted.bronze} bronze.`}
          checked={manual}
          onChange={setManual}
        />
        {manual && (
          <div className={s.cols}>
            {(["gold", "silver", "bronze"] as const).map((k) => (
              <TextInput key={k} label={k[0].toUpperCase() + k.slice(1)} value={medals[k]} onChange={(v) => setMedals((m) => ({ ...m, [k]: v.replace(/\D/g, "") }))} inputMode="numeric" />
            ))}
          </div>
        )}
      </Section>

      <Section title="About" hint="Optional. Separate paragraphs with a blank line.">
        <Field label="Short bio" optional>
          <textarea className={s.textarea} rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
      </Section>

      <PublishBar
        collection="players"
        build={build}
        isNew={isNew}
        wasDraft={isDraft}
        onSaved={(_slug, draft) => (setIsNew(false), setSlugTouched(true), setSlug(effectiveSlug), setIsDraft(draft))}
        publicPath={(sl) => `/players/${sl}`}
        editPath={(sl) => `/admin/players/${sl}`}
      />
    </div>
  );
}
