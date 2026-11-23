import { notFound } from "next/navigation";
import { listEntries, readEntry } from "@/lib/admin/content";
import { UpdateEditor, type UpdateInitial } from "@/components/admin/UpdateEditor";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";

export const metadata = { title: "Edit update" };

export default async function EditUpdate({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await attempt(() => Promise.all([readEntry("updates", slug), listEntries("articles")]));
  if (!r.data) return <SetupNotice>{r.error}</SetupNotice>;
  const [entry, articles] = r.data;
  if (!entry) notFound();
  const initial = entry.data as UpdateInitial;
  return (
    <>
      <PageHead kicker="Edit update" title={initial.title ?? slug} />
      <UpdateEditor key={slug} isNew={false} initial={{ ...initial, slug }} body={entry.body} articles={articles.filter((a) => !a.draft || a.slug === initial.article).map((a) => ({ slug: a.slug, title: a.title }))} />
      <div style={{ marginTop: 40 }}>
        <DeleteButton collection="updates" slug={slug} title={initial.title ?? slug} after="/admin/updates" />
      </div>
    </>
  );
}
