"use client";

import { useState } from "react";
import { slugify } from "@/lib/admin/shared";
import { previewMarkdown } from "@/app/admin/actions";
import { todayInIndia } from "./client";
import { Choice, Field, ImageField, MarkdownField, Section, SlugField, TextArea, TextInput, Toggle, type ImageValue, type Upload } from "./fields";
import { PublishBar } from "./PublishBar";
import s from "./admin.module.css";

export interface UpdateInitial {
  title?: string;
  slug?: string;
  type?: string;
  publishedAt?: string;
  summary?: string;
  pinned?: boolean;
  image?: ImageValue;
  action?: { label: string; url: string };
  article?: string;
  event?: { startDate: string; endDate?: string; startTime?: string; endTime?: string; city: string; venue?: string; registrationUrl?: string };
  draft?: boolean;
}

const TYPES = [
  { value: "announcement", label: "Announcement" },
  { value: "tournament", label: "Tournament" },
  { value: "result", label: "Result" },
  { value: "community", label: "Community" },
  { value: "platform", label: "Platform" },
] as const;

export function UpdateEditor({ initial, body: initialBody, isNew: startsNew, articles }: { initial: UpdateInitial; body: string; isNew: boolean; articles: Array<{ slug: string; title: string }> }) {
  const [isNew, setIsNew] = useState(startsNew);
  const [isDraft, setIsDraft] = useState(initial.draft ?? true);
  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [type, setType] = useState<string>(initial.type ?? "announcement");
  const [publishedAt, setPublishedAt] = useState(initial.publishedAt ?? todayInIndia());
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [pinned, setPinned] = useState(initial.pinned ?? false);
  const [image, setImage] = useState<ImageValue | undefined>(initial.image);
  const [hasAction, setHasAction] = useState(!!initial.action);
  const [action, setAction] = useState(initial.action ?? { label: "", url: "" });
  const [article, setArticle] = useState(initial.article ?? "");
  const [hasEvent, setHasEvent] = useState(!!initial.event);
  const [event, setEvent] = useState(initial.event ?? { startDate: "", endDate: "", startTime: "", endTime: "", city: "", venue: "", registrationUrl: "" });
  const [body, setBody] = useState(initialBody);
  const [uploads, setUploads] = useState<Upload[]>([]);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const addUpload = (u: Upload) => setUploads((x) => [...x, u]);
  const ev = (k: keyof typeof event) => (v: string) => setEvent((e) => ({ ...e, [k]: v }));

  function build(draft: boolean) {
    if (!title.trim()) return "Add a title.";
    if (!effectiveSlug) return "Add a web address.";
    if (!body.trim()) return "Write the update text.";
    if (image && !image.alt.trim()) return "Describe the photo (the “Describe the photo” box).";
    if (hasEvent && (!event.startDate || !event.city.trim())) return "An event needs at least a start date and a city.";
    if (hasAction && (!action.label.trim() || !action.url.trim())) return "The button needs both a label and a link.";
    return {
      mode: isNew ? "create" : "edit",
      body,
      uploads,
      data: {
        title,
        slug: effectiveSlug,
        type,
        publishedAt,
        summary,
        pinned,
        image,
        action: hasAction ? action : undefined,
        article: article || undefined,
        event: hasEvent ? event : undefined,
        draft,
      },
    };
  }

  return (
    <div className={s.form}>
      <Section title="The update" hint="Short news: one to three paragraphs is perfect.">
        <TextInput label="Title" value={title} onChange={setTitle} maxLength={140} placeholder="e.g. Registrations open for the Pune Open 2026" />
        <SlugField
          value={effectiveSlug}
          onChange={(v) => (setSlugTouched(true), setSlug(v))}
          prefix="/updates/"
          locked={!isNew}
          title={title}
        />
        <Choice label="Type" value={type} onChange={setType} options={[...TYPES]} />
        <div className={s.cols}>
          <TextInput label="Date" type="date" value={publishedAt} onChange={setPublishedAt} help="Shown on the update; newest first." />
          <Field label="Pin to top">
            <Toggle label="Pinned" help="Pinned updates stay at the top of the Updates page." checked={pinned} onChange={setPinned} />
          </Field>
        </div>
        <MarkdownField
          label="Text"
          value={body}
          onChange={setBody}
          collection="updates"
          slug={effectiveSlug}
          onUploaded={addUpload}
          preview={previewMarkdown}
          rows={10}
          help="Use the buttons for bold, links, lists and photos. A YouTube or Instagram link on its own line becomes a video player."
        />
        <TextArea label="Summary" optional value={summary} onChange={setSummary} maxLength={300} rows={2} help="One line used for link previews and the RSS feed. If empty, the start of the text is used." />
      </Section>

      <Section title="Photo" hint="Optional — shown with the update and in link previews.">
        <ImageField label="Photo" value={image} onChange={setImage} onUploaded={addUpload} collection="updates" slug={effectiveSlug} />
      </Section>

      <Section title="Event" hint="Turn this update into an event card with a date badge, live countdown, Add-to-calendar and an optional Register button.">
        <Toggle label="This update is about an event" checked={hasEvent} onChange={setHasEvent} />
        {hasEvent && (
          <>
            <div className={s.cols}>
              <TextInput label="Start date" type="date" value={event.startDate} onChange={ev("startDate")} />
              <TextInput label="End date" optional type="date" value={event.endDate ?? ""} onChange={ev("endDate")} help="For events over several days." />
              <TextInput label="Start time" optional type="time" value={event.startTime ?? ""} onChange={ev("startTime")} help="India time." />
              <TextInput label="End time" optional type="time" value={event.endTime ?? ""} onChange={ev("endTime")} />
            </div>
            <div className={s.cols}>
              <TextInput label="City" value={event.city} onChange={ev("city")} placeholder="e.g. Pune" />
              <TextInput label="Venue" optional value={event.venue ?? ""} onChange={ev("venue")} />
            </div>
            <TextInput label="Registration link" optional type="url" value={event.registrationUrl ?? ""} onChange={ev("registrationUrl")} placeholder="https://" help="Adds a Register button. Must start with https://" />
          </>
        )}
      </Section>

      <Section title="Extras" hint="Optional.">
        <Toggle label="Add a button" help="E.g. “See the post” linking to Instagram." checked={hasAction} onChange={setHasAction} />
        {hasAction && (
          <div className={s.cols}>
            <TextInput label="Button label" value={action.label} onChange={(label) => setAction((a) => ({ ...a, label }))} maxLength={40} placeholder="See the post" />
            <TextInput label="Button link" value={action.url} onChange={(url) => setAction((a) => ({ ...a, url }))} placeholder="https://" help="An https:// link, or a page on this site like /contact." />
          </div>
        )}
        <Field label="Related article" optional help={articles.length ? "Shows a link to the article under the update." : "No published articles yet."}>
          <select className={s.select} value={article} onChange={(e) => setArticle(e.target.value)} disabled={!articles.length}>
            <option value="">None</option>
            {articles.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <PublishBar
        collection="updates"
        build={build}
        isNew={isNew}
        wasDraft={isDraft}
        onSaved={(_slug, draft) => (setIsNew(false), setSlugTouched(true), setSlug(effectiveSlug), setIsDraft(draft))}
        publicPath={(sl) => `/updates/${sl}`}
        editPath={(sl) => `/admin/updates/${sl}`}
      />
    </div>
  );
}
