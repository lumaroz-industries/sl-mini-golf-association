import type { HomeContent } from "@/content/schema";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./IntroSection.module.css";

/** 02 — Association introduction (long version of the copy). */
export function IntroSection({ intro }: { intro: HomeContent["intro"] }) {
  return (
    <section className={styles.section} aria-labelledby="intro-title">
      <div className={`container ${styles.grid}`}>
        <Reveal className={styles.head}>
          <span className="kicker">{intro.kicker}</span>
          <h2 id="intro-title" className={styles.title}>
            {intro.heading}
          </h2>
        </Reveal>
        <Reveal index={1} className={styles.body}>
          <p>{intro.body}</p>
        </Reveal>
      </div>
    </section>
  );
}
