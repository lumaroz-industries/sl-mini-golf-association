import Link from "next/link";
import { listAlbums, listEntries } from "@/lib/admin/content";
import { githubConfig } from "@/lib/admin/storage";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const gh = githubConfig();
  const onVercel = !!process.env.VERCEL;
  const counts = await attempt(async () => {
    const [u, a, g] = await Promise.all([listEntries("updates"), listEntries("articles"), listAlbums()]);
    return { updates: u.length, articles: a.length, gallery: g.length };
  });
  const tiles = [
    { href: "/admin/updates", title: "Updates", text: "Short news, tournament announcements, results and events.", n: counts.data?.updates, unit: "update" },
    { href: "/admin/articles", title: "Articles", text: "Longer stories with photos, galleries and videos.", n: counts.data?.articles, unit: "article" },
    { href: "/admin/gallery", title: "Gallery", text: "Photo albums from tournaments and players.", n: counts.data?.gallery, unit: "album" },
  ];
  return (
    <>
      <PageHead kicker="SL Mini Golf Association" title="Admin" lede="Write, edit and publish. Everything you publish appears on the website about a minute or two later." />
      {onVercel && !gh.token && (
        <SetupNotice>
          <b>Publishing is not switched on yet.</b> Add <code>ADMIN_GITHUB_TOKEN</code> in Vercel → Settings → Environment Variables and redeploy (see the README, “Admin”).
        </SetupNotice>
      )}
      {!onVercel && !gh.token && <SetupNotice>Local mode: changes are saved straight into this folder (no GitHub token set).</SetupNotice>}
      {counts.error && <SetupNotice>{counts.error}</SetupNotice>}
      <div className={s.grid}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={s.tile}>
            <span className={s.count}>{t.n === undefined ? "—" : `${t.n} ${t.unit}${t.n === 1 ? "" : "s"}`}</span>
            <span className={s.tileTitle}>{t.title}</span>
            <p>{t.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
