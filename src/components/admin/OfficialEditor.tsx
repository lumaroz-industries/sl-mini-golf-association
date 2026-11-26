"use client";

import { useState } from "react";
import { slugify } from "@/lib/admin/shared";
import { Choice, Field, ImageField, Section, SlugField, TextInput, type ImageValue, type Upload } from "./fields";
import { PublishBar } from "./PublishBar";
import s from "./admin.module.css";

export interface OfficialInitial {
  id?: string;
  name?: string;
  role?: string;
  level?: string;
  organisation?: string;
  photo?: ImageValue;
  district?: string;
  since?: number;
  bio?: string;
  instagram?: string;
  email?: string;
  draft?: boolean;
}

/** Add or edit an official: everything shown on their card on the Officials page. */
export function OfficialEditor({ initial, isNew: startsNew, levels }: { initial: OfficialInitial; isNew: boolean; levels: Array<{ id: string; title: string; subtitle: string }> }) {
  const [isNew, setIsNew] = useState(startsNew);
  const [isDraft, setIsDraft] = useState(initial.draft ?? false);
  const [name, setName] = useState(initial.name ?? "");
  const [id, setId] = useState(initial.id ?? "");
  const [idTouched, setIdTouched] = useState(!startsNew);
  const [role, setRole] = useState(initial.role ?? "");
  const [level, setLevel] = useState(initial.level ?? levels[0]?.id ?? "india");
  const [organisation, setOrganisation] = useState(initial.organisation ?? "");
  const [district, setDistrict] = useState(initial.district ?? "");
  const [since, setSince] = useState(initial.since ? String(initial.since) : "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [instagram, setInstagram] = useState(initial.instagram ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [photo, setPhoto] = useState<ImageValue | undefined>(initial.photo);
  const [uploads, setUploads] = useState<Upload[]>([]);
  // Titles like "Dr." are kept in the name but not in the web address.
  const effectiveId = idTouched ? id : slugify(name.replace(/^(dr|mr|mrs|ms|shri|smt)\.?\s+/i, ""));

  function build(draft: boolean) {
    if (!name.trim()) return "Add the official's name.";
    if (!role.trim()) return "Add their position, e.g. President.";
    if (!effectiveId) return "Add a web address.";
    if (photo && !photo.alt.trim()) return "Describe the photo.";
    if (since && !/^\d{4}$/.test(since)) return "“Since” must be a year, e.g. 2024.";
    if (instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(instagram.trim())) return "The Instagram link must start with https://www.instagram.com/";
    return {
      mode: isNew ? "create" : "edit",
      uploads,
      data: {
        id: effectiveId,
        name,
        role,
        level,
        organisation,
        photo: photo ? { src: photo.src, alt: photo.alt, width: photo.width, height: photo.height } : undefined,
        district,
        since: since ? Number(since) : undefined,
        bio,
        instagram: instagram.trim() || undefined,
        email: email.trim() || undefined,
        draft,
      },
    };
  }

  return (
    <div className={s.form}>
      <Section title="Official">
        <TextInput label="Full name" value={name} onChange={setName} maxLength={60} placeholder="e.g. Sudhakar Kohale" help="Include a title if they use one, e.g. “Dr.”." />
        <SlugField value={effectiveId} onChange={(v) => (setIdTouched(true), setId(v))} prefix="/officials#" locked={!isNew} title={name} />
        <div className={s.cols}>
          <TextInput label="Position" value={role} onChange={setRole} maxLength={60} placeholder="e.g. President" />
          <TextInput label="Organisation" optional value={organisation} onChange={setOrganisation} placeholder="e.g. Minigolf Federation of India" />
        </div>
        <Choice label="Level" value={level} onChange={setLevel} options={levels.map((l) => ({ value: l.id, label: `${l.title} · ${l.subtitle}` }))} />
      </Section>

      <Section title="Photo" hint="A portrait photo (about 4:5), head and shoulders. Without one, the card shows their initials.">
        <ImageField label="Photo" value={photo} onChange={setPhoto} onUploaded={(u) => setUploads((x) => [...x, u])} collection="officials" slug={effectiveId} withCredit={false} />
      </Section>

      <Section title="On the card" hint="All optional. Only what you fill in is shown.">
        <div className={s.cols}>
          <TextInput label="District" optional value={district} onChange={setDistrict} placeholder="e.g. Nagpur" />
          <TextInput label="In the role since" optional value={since} onChange={(v) => setSince(v.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="e.g. 2024" />
        </div>
        <Field label="About them" optional help="One or two lines.">
          <textarea className={s.textarea} rows={3} maxLength={240} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <div className={s.cols}>
          <TextInput label="Instagram link" optional value={instagram} onChange={setInstagram} placeholder="https://www.instagram.com/…" />
          <TextInput label="Email" optional value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
        </div>
      </Section>

      <PublishBar
        collection="officials"
        build={build}
        isNew={isNew}
        wasDraft={isDraft}
        onSaved={(_id, draft) => (setIsNew(false), setIdTouched(true), setId(effectiveId), setIsDraft(draft))}
        publicPath={(sl) => `/officials#official-${sl}`}
        editPath={(sl) => `/admin/officials/${sl}`}
      />
    </div>
  );
}
