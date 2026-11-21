import type { HomeContent } from "@/content/schema";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./VisionMissionSection.module.css";

/** 03 — Vision and mission. */
export function VisionMissionSection({ content }: { content: HomeContent["visionMission"] }) {
  const blocks = [
    { id: "vision", label: "Vision", text: content.vision },
    { id: "mission", label: "Mission", text: content.mission },
  ];
  return (
    <section className={styles.section} aria-labelledby="vm-title">
      <div className="container">
        <Reveal>
          <h2 id="vm-title" className="kicker">
            {content.kicker}
          </h2>
        </Reveal>
        <div className={styles.grid}>
          {blocks.map((b, i) => (
            <Reveal as="article" key={b.id} index={i} className={styles.block} aria-labelledby={`vm-${b.id}`}>
              <h3 id={`vm-${b.id}`} className={styles.label}>
                <span className={styles.num} aria-hidden="true">
                  0{i + 1}
                </span>
                {b.label}
              </h3>
              <p className={styles.text}>{b.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
