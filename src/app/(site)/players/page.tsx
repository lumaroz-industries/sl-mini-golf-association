import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { getPlayersPageContent } from "@/content/repository";
import { TopSeven } from "@/components/players/TopSeven";
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
  const content = await getPlayersPageContent();
  const slots = buildSlots(content.featured);

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
    </div>
  );
}
