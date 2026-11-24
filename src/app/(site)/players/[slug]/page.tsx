import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayers, getPlayersPageContent, getTopSeven } from "@/content/repository";
import { PLAYER_LEVEL_LABELS } from "@/content/schema";
import { medalTotals, ordinal } from "@/lib/players";
import { getBaseUrl } from "@/lib/site-url";
import { MedalDefs, MedalIcon, type MedalKind } from "@/components/players/MedalDefs";
import { PlayerCard } from "@/components/players/PlayerCard";
import { Tilt } from "@/components/players/Tilt";
import styles from "./page.module.css";

interface Params {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPlayers()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [player, top, content] = await Promise.all([getPlayer((await params).slug), getTopSeven(), getPlayersPageContent()]);
  if (!player) return {};
  const inTop = top.some((t) => t.slug === player.slug);
  const description = inTop ? `${player.name} — one of ${content.heading}.` : `${player.name} — mini-golf player from ${player.district ? `${player.district}, ` : ""}Maharashtra.`;
  return {
    title: player.name,
    description,
    alternates: { canonical: `/players/${player.slug}` },
    openGraph: { title: player.name, description, ...(player.photo ? { images: [{ url: player.photo.src, alt: player.photo.alt }] } : {}) },
  };
}

const MEDALS: Array<{ kind: MedalKind; label: string }> = [
  { kind: "gold", label: "Gold" },
  { kind: "silver", label: "Silver" },
  { kind: "bronze", label: "Bronze" },
];

export default async function PlayerPage({ params }: Params) {
  const { slug } = await params;
  const [player, content, base, top] = await Promise.all([getPlayer(slug), getPlayersPageContent(), getBaseUrl(), getTopSeven()]);
  if (!player) notFound();
  const inTop = top.some((t) => t.slug === player.slug);
  const medals = medalTotals(player);
  const counts = MEDALS.map((m) => medals[m.kind]);
  const years = [...new Set(player.results.map((r) => r.year))].sort((a, b) => b - a);
  const LEVEL_ORDER = ["international", "national", "state", "district"];
  const total = counts.every((n) => n !== undefined) ? counts.reduce<number>((a, b) => a + (b ?? 0), 0) : undefined;
  const paragraphs = player.bio?.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.name,
    url: new URL(`/players/${player.slug}`, base).toString(),
    ...(player.photo ? { image: new URL(player.photo.src, base).toString() } : {}),
    knowsAbout: "Mini golf",
    homeLocation: { "@type": "Place", name: "Maharashtra, India" },
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <MedalDefs />
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.layout}`}>
        <div className={styles.cardCol}>
          <Tilt className={styles.tilt}>
            <PlayerCard player={{ slug: player.slug, name: player.name, photo: player.photo, medals }} revealLabel={content.revealLabel} large priority badge={inTop ? "Top 7" : "Player"} />
          </Tilt>
        </div>

        <div className={styles.info}>
          <Link href={inTop ? "/players" : "/players#directory-title"} className={styles.back}>
            <span aria-hidden="true">←</span> {inTop ? content.heading : content.directory.heading}
          </Link>
          <h1 className={styles.name}>{player.name}</h1>
          <p className={styles.where}>
            {[player.district, "Maharashtra"].filter(Boolean).join(", ")}
            {inTop && <span className={styles.topBadge}>Top 7</span>}
          </p>

          <ul className={styles.tally} aria-label="Medal tally">
            {MEDALS.map(({ kind, label }, i) => (
              <li key={kind} data-kind={kind}>
                <MedalIcon kind={kind} size={34} />
                <b>{counts[i] ?? "–"}</b>
                <span>{label}</span>
              </li>
            ))}
            {total !== undefined && (
              <li data-kind="total">
                <b>{total}</b>
                <span>Total</span>
              </li>
            )}
          </ul>

          {paragraphs.length > 0 && (
            <div className={styles.bio}>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {years.length > 0 && (
            <section className={styles.results} aria-labelledby="results-title">
              <h2 id="results-title" className={styles.resultsTitle}>
                Results
              </h2>
              {years.map((y) => (
                <div key={y} className={styles.year}>
                  <span className={styles.yearLabel}>{y}</span>
                  <ul className={styles.resultList}>
                    {player.results
                      .filter((r) => r.year === y)
                      .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
                      .map((r, i) => (
                        <li key={i} className={styles.result}>
                          <span className={styles.resultMain}>
                            <span className={styles.resultEvent}>{r.event}</span>
                            <span className={styles.resultMeta}>{[r.category, r.place].filter(Boolean).join(" · ")}</span>
                          </span>
                          <span className={styles.resultLevel} data-level={r.level}>
                            {PLAYER_LEVEL_LABELS[r.level]}
                          </span>
                          <span className={styles.resultOutcome}>
                            {r.medal ? (
                              <>
                                <MedalIcon kind={r.medal} size={20} /> {r.medal[0].toUpperCase() + r.medal.slice(1)}
                              </>
                            ) : r.position ? (
                              ordinal(r.position)
                            ) : (
                              "Participated"
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
