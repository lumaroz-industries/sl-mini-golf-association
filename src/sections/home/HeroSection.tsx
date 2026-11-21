import type { HomeContent } from "@/content/schema";
import styles from "./HeroSection.module.css";

/**
 * 01 — Cinematic opening and hero.
 * Milestone 2 mounts the scroll-driven 3D experience behind this content;
 * until then a lightweight CSS putting-green horizon stands in.
 */
export function HeroSection({ hero }: { hero: HomeContent["hero"] }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.glow} />
        <div className={styles.floor} />
        <div className={styles.ball} />
      </div>

      <div className={`container ${styles.content}`}>
        <h1 id="hero-title" className={styles.title}>
          {hero.title}
        </h1>
        <p className={styles.tagline}>
          <span>{hero.taglineLines[0]}</span>
          <span>{hero.taglineLines[1]}</span>
        </p>
        <p className={styles.supporting}>{hero.supporting}</p>
      </div>

      <div className={styles.cue} aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}
