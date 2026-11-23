import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeaturedPlayer, getPlayersPageContent } from "@/content/repository";
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
  return (await getPlayersPageContent()).featured.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [player, content] = await Promise.all([getFeaturedPlayer((await params).slug), getPlayersPageContent()]);
  if (!player) return {};
  const description = `${player.name} — one of ${content.heading}.`;
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
  const [player, content, base] = await Promise.all([getFeaturedPlayer(slug), getPlayersPageContent(), getBaseUrl()]);
  if (!player) notFound();
  const counts = MEDALS.map((m) => player.medals[m.kind]);
  const total = counts.every((n) => n !== undefined) ? counts.reduce<number>((a, b) => a + (b ?? 0), 0) : undefined;
  const others = content.featured.filter((p) => p.slug !== player.slug);
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
            <PlayerCard player={{ slug: player.slug, name: player.name, photo: player.photo, medals: player.medals }} revealLabel={content.revealLabel} large priority />
          </Tilt>
        </div>

        <div className={styles.info}>
          <Link href="/players" className={styles.back}>
            <span aria-hidden="true">←</span> {content.heading}
          </Link>
          <h1 className={styles.name}>{player.name}</h1>

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

          {others.length > 0 && (
            <nav className={styles.others} aria-label={`More of ${content.heading}`}>
              <span className={styles.othersLabel}>More of the Top 7</span>
              <ul>
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/players/${o.slug}`}>{o.name}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
