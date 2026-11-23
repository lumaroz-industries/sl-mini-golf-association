import { listEntries } from "@/lib/admin/content";
import { UpdateEditor } from "@/components/admin/UpdateEditor";
import { attempt, PageHead } from "@/components/admin/Page";

export const metadata = { title: "New update" };

export default async function NewUpdate() {
  const articles = (await attempt(() => listEntries("articles"))).data ?? [];
  return (
    <>
      <PageHead kicker="Updates" title="New update" />
      <UpdateEditor isNew initial={{}} body="" articles={articles.filter((a) => !a.draft).map((a) => ({ slug: a.slug, title: a.title }))} />
    </>
  );
}
