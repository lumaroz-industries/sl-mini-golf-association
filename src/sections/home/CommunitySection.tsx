import type { HomeContent } from "@/content/schema";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./CommunitySection.module.css";

/** 04 — Community and impact. Messages only — no fabricated statistics. */
export function CommunitySection({ content }: { content: HomeContent["community"] }) {
  return (
    <section className={styles.section} aria-labelledby="community-title">
      <div className="container">
        <Reveal className={styles.head}>
          <span className="kicker">{content.kicker}</span>
          <h2 id="community-title" className={styles.title}>
            {content.heading}
          </h2>
        </Reveal>
        <ol className={styles.list}>
          {content.items.map((item, i) => (
            <Reveal as="li" key={item.id} index={i} className={styles.item}>
              <span className={styles.index} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.itemBody}>{item.body}</p>
              <span className={styles.line} aria-hidden="true" />
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
