import Link from "next/link";
import { listEntries } from "@/lib/admin/content";
import categories from "@/content/sources/local/article-categories.json";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, formatDate, PageHead, SetupNotice, StatusPill } from "@/components/admin/Page";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Articles" };

export default async function ArticlesList() {
  const r = await attempt(() => listEntries("articles"));
  return (
    <>
      <PageHead kicker="Articles" title="Articles" lede="Longer stories: player journeys, tournament reports, guides and community news." action={{ href: "/admin/articles/new", label: "+ New article" }} />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && r.data.length === 0 && <div className={s.empty}>No articles yet. Click “New article” to write the first one.</div>}
      <ul className={s.list}>
        {r.data?.map((a) => (
          <li key={a.slug} className={s.row}>
            <div className={s.rowMain}>
              <Link href={`/admin/articles/${a.slug}`} className={s.rowTitle}>
                {a.title}
              </Link>
              <div className={s.rowMeta}>
                <StatusPill draft={a.draft} invalid={a.invalid} />
                <span>{categories.find((c) => c.id === a.label)?.label ?? a.label}</span>
                <span>·</span>
                <span>{formatDate(a.date)}</span>
              </div>
            </div>
            <div className={s.rowActions}>
              <Link href={`/admin/articles/${a.slug}`} className={`${s.btn} ${s.small}`}>
                Edit
              </Link>
              <DeleteButton collection="articles" slug={a.slug} title={a.title} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
