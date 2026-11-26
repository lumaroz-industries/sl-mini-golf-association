import Link from "next/link";
import { listPlayers } from "@/lib/admin/content";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, PageHead, SetupNotice, StatusPill } from "@/components/admin/Page";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Players" };

export default async function PlayersList() {
  const r = await attempt(() => listPlayers());
  return (
    <>
      <PageHead kicker="Players" title="Players" lede="Every Maharashtra player in the directory, with their results. Top 7 and International players are marked." action={{ href: "/admin/players/new", label: "+ New player" }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "-8px 0 24px" }}>
        <Link href="/admin/players/top-7" className={`${s.btn}`}>
          ★ Choose the Top 7
        </Link>
        <Link href="/admin/players/international" className={`${s.btn}`}>
          ◆ International players
        </Link>
        <span className={s.help} style={{ alignSelf: "center" }}>
          {r.data ? `${r.data.filter((p) => p.topSeven).length} of 7 places filled · ${r.data.filter((p) => p.international).length} in International` : ""}
        </span>
      </div>
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && r.data.length === 0 && <div className={s.empty}>No players yet. Click “New player” to add the first one.</div>}
      <ul className={s.list}>
        {r.data?.map((p) => (
          <li key={p.slug} className={s.row}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.photo ? <img className={s.rowThumb} src={p.photo} alt="" style={{ width: 48, height: 60 }} /> : <span className={s.rowThumb} style={{ width: 48, height: 60 }} />}
            <div className={s.rowMain}>
              <Link href={`/admin/players/${p.slug}`} className={s.rowTitle}>
                {p.name}
              </Link>
              <div className={s.rowMeta}>
                <StatusPill draft={p.draft} />
                {p.topSeven && <span className={s.pill}>Top 7</span>}
                {p.international && <span className={s.pill}>International</span>}
                {p.district && <span>{p.district}</span>}
                <span>
                  {p.results} result{p.results === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className={s.rowActions}>
              <Link href={`/admin/players/${p.slug}`} className={`${s.btn} ${s.small}`}>
                Edit
              </Link>
              {!p.topSeven && <DeleteButton collection="players" slug={p.slug} title={p.name} />}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
