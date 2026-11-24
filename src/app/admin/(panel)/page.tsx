import Link from "next/link";
import { listAlbums, listEntries, listPlayers } from "@/lib/admin/content";
import { githubConfig } from "@/lib/admin/storage";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import s from "@/components/admin/admin.module.css";
import c from "@/components/admin/credits.module.css";
import { Greeting } from "@/components/admin/Greeting";
import { TeamCard } from "@/components/admin/TeamCard";
import { getTeam } from "@/lib/admin/team";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const gh = githubConfig();
  const onVercel = !!process.env.VERCEL;
  const counts = await attempt(async () => {
    const [u, a, g, p] = await Promise.all([listEntries("updates"), listEntries("articles"), listAlbums(), listPlayers()]);
    return { updates: u.length, articles: a.length, gallery: g.length, players: p.length };
  });
  const { owner, dev } = await getTeam();
  const tiles = [
    { href: "/admin/updates", title: "Updates", text: "Short news, tournament announcements, results and events.", n: counts.data?.updates, unit: "update" },
    { href: "/admin/articles", title: "Articles", text: "Longer stories with photos, galleries and videos.", n: counts.data?.articles, unit: "article" },
    { href: "/admin/gallery", title: "Gallery", text: "Photo albums from tournaments and players.", n: counts.data?.gallery, unit: "album" },
    { href: "/admin/players", title: "Players", text: "The Maharashtra player directory and every player's results.", n: counts.data?.players, unit: "player" },
  ];
  return (
    <>
      <PageHead kicker="SL Mini Golf Association" title="Admin" lede="Write, edit and publish. Everything you publish appears on the website about a minute or two later." />
      <div style={{ marginBottom: 28 }}>
        <Greeting dev={{ name: dev.name, url: dev.instagram?.url }} />
      </div>
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

      <section className={c.team} aria-label="The team">
        <p className={c.teamHead}>The team behind SL Admin</p>
        <TeamCard
          person={dev}
          finish="diamond"
          kicker="Built & maintained by"
          text="Designed and engineered this admin panel and the website. Found a bug or want something new? Message me directly."
        />
        <TeamCard person={owner} finish="gold" kicker="Founder & Owner" text="SL Mini Golf Association — putting Indian mini golf and its players in the spotlight." />
      </section>
    </>
  );
}
