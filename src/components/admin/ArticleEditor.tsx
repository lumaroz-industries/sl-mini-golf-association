"use client";

import { useState } from "react";
import { slugify } from "@/lib/admin/shared";
import { previewMarkdown } from "@/app/admin/actions";
import { todayInIndia } from "./client";
import { Choice, Field, ImageField, MarkdownField, Section, SlugField, TextArea, TextInput, Toggle, type ImageValue, type Upload } from "./fields";
import { PublishBar } from "./PublishBar";
import s from "./admin.module.css";

export interface ArticleInitial {
  title?: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  author?: { personId: string } | { name: string; bio?: string };
  publishedAt?: string;
  updatedAt?: string;
  cover?: ImageValue;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
}

const STARTER = `Start with a short, strong opening paragraph — it is shown a little larger, so tell the reader why this story matters.

## First section

Write in short paragraphs: two to four sentences reads best on a phone.
`;

export function ArticleEditor({
  initial,
  body: initialBody,
  isNew: startsNew,
  categories,
  people,
}: {
  initial: ArticleInitial;
  body: string;
  isNew: boolean;
  categories: Array<{ id: string; label: string; description: string }>;
  people: Array<{ id: string; name: string; role: string }>;
}) {
  const [isNew, setIsNew] = useState(startsNew);
  const [isDraft, setIsDraft] = useState(initial.draft ?? true);
  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [category, setCategory] = useState(initial.category ?? categories[0]?.id ?? "");
  const guestInitial = initial.author && "name" in initial.author ? initial.author : undefined;
  const [authorKind, setAuthorKind] = useState<string>(guestInitial ? "guest" : initial.author && "personId" in initial.author ? initial.author.personId : people[0]?.id ?? "guest");
  const [guest, setGuest] = useState({ name: guestInitial?.name ?? "", bio: guestInitial?.bio ?? "" });
  const [publishedAt, setPublishedAt] = useState(initial.publishedAt ?? todayInIndia());
  const [markUpdated, setMarkUpdated] = useState(false);
  const [cover, setCover] = useState<ImageValue | undefined>(initial.cover);
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [featured, setFeatured] = useState(initial.featured ?? false);
  const [body, setBody] = useState(initialBody || (isNew ? STARTER : ""));
  const [uploads, setUploads] = useState<Upload[]>([]);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const addUpload = (u: Upload) => setUploads((x) => [...x, u]);

  function build(draft: boolean) {
    if (!title.trim()) return "Add a title.";
    if (!effectiveSlug) return "Add a web address.";
    if (!excerpt.trim()) return "Add a short introduction (shown on the articles page and in link previews).";
    if (authorKind === "guest" && !guest.name.trim()) return "Add the guest writer's name.";
    if (cover && !cover.alt.trim()) return "Describe the cover photo.";
    if (/!\[Describe this photo\]/.test(body)) return "Replace each “Describe this photo” in the text with a short description of that photo.";
    if (/watch\?v=VIDEO_ID/.test(body)) return "Replace the example video link (VIDEO_ID) with a real YouTube link, or remove it.";
    return {
      mode: isNew ? "create" : "edit",
      body,
      uploads,
      data: {
        title,
        slug: effectiveSlug,
        excerpt,
        category,
        author: authorKind === "guest" ? guest : { personId: authorKind },
        publishedAt,
        updatedAt: markUpdated ? todayInIndia() : initial.updatedAt,
        cover,
        tags: tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        featured,
        draft,
      },
    };
  }

  return (
    <div className={s.form}>
      <Section title="Headline">
        <TextInput label="Title" value={title} onChange={setTitle} maxLength={140} placeholder="e.g. From Pune to the Asian Championship" />
        <SlugField value={effectiveSlug} onChange={(v) => (setSlugTouched(true), setSlug(v))} prefix="/articles/" locked={!isNew} title={title} />
        <TextArea label="Introduction" value={excerpt} onChange={setExcerpt} maxLength={320} rows={3} help="One or two sentences shown on the Articles page, in search results and in link previews." />
        <Choice label="Category" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c.id, label: c.label }))} help={categories.find((c) => c.id === category)?.description} />
      </Section>

      <Section title="Cover photo" hint="Shown at the top of the article and as the link preview. Landscape photos work best.">
        <ImageField label="Cover photo" value={cover} onChange={setCover} onUploaded={addUpload} collection="articles" slug={effectiveSlug} />
      </Section>

      <Section title="Article" hint="Use ## headings to split it into sections — with three or more, a contents list appears automatically.">
        <MarkdownField
          label="Text"
          value={body}
          onChange={setBody}
          collection="articles"
          slug={effectiveSlug}
          onUploaded={addUpload}
          preview={previewMarkdown}
          help={
            <>
              <b>Photo</b> adds a photo where your cursor is (choose several at once for a gallery); write its description in the [square brackets] and an optional caption in the “quotes”. <b>Video</b>: paste a YouTube or Instagram link on its own line.
              Click <b>Preview</b> to see it exactly as on the website.
            </>
          }
        />
      </Section>

      <Section title="Details">
        <Choice
          label="Written by"
          value={authorKind}
          onChange={setAuthorKind}
          options={[...people.map((p) => ({ value: p.id, label: p.name })), { value: "guest", label: "Guest writer" }]}
        />
        {authorKind === "guest" && (
          <div className={s.cols}>
            <TextInput label="Guest's name" value={guest.name} onChange={(name) => setGuest((g) => ({ ...g, name }))} />
            <TextInput label="One line about them" optional value={guest.bio} onChange={(bio) => setGuest((g) => ({ ...g, bio }))} />
          </div>
        )}
        <div className={s.cols}>
          <TextInput label="Date" type="date" value={publishedAt} onChange={setPublishedAt} />
          <TextInput label="Tags" optional value={tags} onChange={setTags} help="Separate with commas, e.g. pune, juniors." />
        </div>
        {!isNew && !initial.draft && <Toggle label="Show “Updated today”" help="Tick this when you have made an important correction." checked={markUpdated} onChange={setMarkUpdated} />}
        <Field label="Featured">
          <Toggle label="Feature this article" help="Shown large at the top of the Articles page (the newest featured article is used)." checked={featured} onChange={setFeatured} />
        </Field>
      </Section>

      <PublishBar collection="articles" build={build} isNew={isNew} wasDraft={isDraft}
        onSaved={(_slug, draft) => (setIsNew(false), setSlugTouched(true), setSlug(effectiveSlug), setIsDraft(draft))} publicPath={(sl) => `/articles/${sl}`} editPath={(sl) => `/admin/articles/${sl}`} />
    </div>
  );
}
