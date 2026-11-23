import { notFound } from "next/navigation";
import { readEntry } from "@/lib/admin/content";
import { ArticleEditor, type ArticleInitial } from "@/components/admin/ArticleEditor";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { articleEditorProps } from "../editorProps";

export const metadata = { title: "Edit article" };

export default async function EditArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await attempt(() => readEntry("articles", slug));
  if (r.error !== undefined) return <SetupNotice>{r.error}</SetupNotice>;
  if (!r.data) notFound();
  const initial = r.data.data as ArticleInitial;
  return (
    <>
      <PageHead kicker="Edit article" title={initial.title ?? slug} />
      <ArticleEditor key={slug} isNew={false} initial={{ ...initial, slug }} body={r.data.body} {...articleEditorProps} />
      <div style={{ marginTop: 40 }}>
        <DeleteButton collection="articles" slug={slug} title={initial.title ?? slug} after="/admin/articles" />
      </div>
    </>
  );
}
