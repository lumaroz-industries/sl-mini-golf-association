import Link from "next/link";
import { listAlbums } from "@/lib/admin/content";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, formatDate, PageHead, SetupNotice, StatusPill } from "@/components/admin/Page";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Gallery" };

export default async function GalleryList() {
  const r = await attempt(() => listAlbums());
  return (
    <>
      <PageHead kicker="Gallery" title="Albums" lede="Photo albums from tournaments and players. Downloads are never offered on the website." action={{ href: "/admin/gallery/new", label: "+ New album" }} />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && r.data.length === 0 && <div className={s.empty}>No albums yet. Click “New album” to add the first photos.</div>}
      <ul className={s.list}>
        {r.data?.map((a) => (
          <li key={a.slug} className={s.row}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {a.cover ? <img className={s.rowThumb} src={a.cover} alt="" /> : <span className={s.rowThumb} />}
            <div className={s.rowMain}>
              <Link href={`/admin/gallery/${a.slug}`} className={s.rowTitle}>
                {a.title}
              </Link>
              <div className={s.rowMeta}>
                <StatusPill draft={a.draft} />
                <span>
                  {a.count} photo{a.count === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>{formatDate(a.date)}</span>
              </div>
            </div>
            <div className={s.rowActions}>
              <Link href={`/admin/gallery/${a.slug}`} className={`${s.btn} ${s.small}`}>
                Edit
              </Link>
              <DeleteButton collection="gallery" slug={a.slug} title={a.title} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
