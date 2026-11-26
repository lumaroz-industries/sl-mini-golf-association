import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { getInternationalPlayers, getPlayers, getPlayersPageContent, getTopSeven } from "@/content/repository";
import { PlayerDirectory } from "@/components/players/PlayerDirectory";
import { MedalDefs } from "@/components/players/MedalDefs";
import { initialsOf, medalTotals, totalMedals } from "@/lib/players";
import { TopSeven } from "@/components/players/TopSeven";
import { InternationalPlayers } from "@/components/players/InternationalPlayers";
import { buildSlots } from "@/components/players/slots";
import styles from "./page.module.css";

const item = findNavItem("/players");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/players" },
};

/** Wraps a trailing number in the heading (e.g. "Top 7") for the foil treatment. */
function Heading({ text }: { text: string }) {
  const m = text.match(/^(.*?)(\d+)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <span className={styles.foilNumber}>{m[2]}</span>
    </>
  );
}

export default async function PlayersPage() {
  const [content, top, players, intl] = await Promise.all([getPlayersPageContent(), getTopSeven(), getPlayers(), getInternationalPlayers()]);
  const slots = buildSlots(top);
  const topSlugs = new Set(top.map((t) => t.slug));
  const directory = players.map((p) => {
    const medals = medalTotals(p);
    return {
      slug: p.slug,
      name: p.name,
      initials: initialsOf(p.name),
      gender: p.gender,
      district: p.district,
      photo: p.photo?.src,
      medals,
      total: totalMedals(medals),
      level: p.card ?? "state",
      results: p.results.map((r) => ({ level: r.level, year: r.year, medal: r.medal })),
      topSeven: topSlugs.has(p.slug),
    };
  });

  // The International section's cards: medals and latest international results.
  const international = intl.map((p) => {
    const medals = medalTotals(p);
    const results = p.results.filter((r) => r.level === "international").sort((a, b) => b.year - a.year);
    return {
      slug: p.slug,
      name: p.name,
      photo: p.intlPhoto ?? p.photo,
      district: p.district,
      medals,
      total: totalMedals(medals),
      results: results.slice(0, 3).map((r) => ({ event: r.event, year: r.year, place: r.place, medal: r.medal, position: r.position })),
      resultCount: results.length,
    };
  });
  const { players: _order, ...intlText } = content.international;

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <section className={styles.featured} aria-labelledby="top-title">
        <header className={`container ${styles.header}`}>
          <span className={styles.kicker}>{content.kicker}</span>
          <h1 id="top-title" className={styles.title}>
            <Heading text={content.heading} />
          </h1>
          <p className={styles.intro}>{content.intro}</p>
        </header>

        <div className={styles.stageWrap}>
          <TopSeven slots={slots} revealLabel={content.revealLabel} />
        </div>

        <p className={`container ${styles.note}`}>{content.note}</p>
      </section>

      <MedalDefs />
      <InternationalPlayers players={international} revealLabel={content.revealLabel} {...intlText} />
      <PlayerDirectory players={directory} {...content.directory} />
    </div>
  );
}
