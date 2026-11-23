import Link from "next/link";
import { listEntries } from "@/lib/admin/content";
import updatesJson from "@/content/sources/local/updates.json";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, formatDate, PageHead, SetupNotice, StatusPill } from "@/components/admin/Page";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Updates" };

export default async function UpdatesList() {
  const r = await attempt(() => listEntries("updates"));
  const labels = updatesJson.typeLabels as Record<string, string>;
  return (
    <>
      <PageHead kicker="Updates" title="Updates" lede="Short news, newest first. Pinned updates stay at the top of the website’s Updates page." action={{ href: "/admin/updates/new", label: "+ New update" }} />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && r.data.length === 0 && <div className={s.empty}>No updates yet. Click “New update” to post the first one.</div>}
      <ul className={s.list}>
        {r.data?.map((u) => (
          <li key={u.slug} className={s.row}>
            <div className={s.rowMain}>
              <Link href={`/admin/updates/${u.slug}`} className={s.rowTitle}>
                {u.title}
              </Link>
              <div className={s.rowMeta}>
                <StatusPill draft={u.draft} invalid={u.invalid} />
                {u.pinned && <span className={s.pill}>Pinned</span>}
                <span>{labels[u.label ?? ""] ?? u.label}</span>
                <span>·</span>
                <span>{formatDate(u.date)}</span>
              </div>
            </div>
            <div className={s.rowActions}>
              <Link href={`/admin/updates/${u.slug}`} className={`${s.btn} ${s.small}`}>
                Edit
              </Link>
              <DeleteButton collection="updates" slug={u.slug} title={u.title} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
