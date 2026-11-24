import Image from "next/image";
import type { HomeContent, Person } from "@/content/schema";
import { Reveal } from "@/components/ui/Reveal";
import { InstagramHandle } from "@/components/ui/InstagramHandle";
import styles from "./PeopleSection.module.css";

interface PeopleSectionProps {
  content: HomeContent["people"];
  people: Person[];
  instagram?: Record<string, { url: string; handle: string }>;
}

/**
 * 05 — The people behind the platform.
 * Equal cards and portrait sizes for everyone. A person without a real
 * photograph gets a reserved branded frame — never a generated face.
 */
export function PeopleSection({ content, people, instagram = {} }: PeopleSectionProps) {
  return (
    <section className={styles.section} aria-labelledby="people-title">
      <div className="container">
        <Reveal className={styles.head}>
          <span className="kicker">{content.kicker}</span>
          <h2 id="people-title" className={styles.title}>
            {content.heading}
          </h2>
        </Reveal>

        <ul className={styles.grid}>
          {people.map((person, i) => (
            <Reveal as="li" key={person.id} index={i} className={styles.card}>
              <figure className={styles.figure}>
                <div className={styles.frame}>
                  {person.portrait ? (
                    <Image
                      src={person.portrait.src}
                      alt={person.portrait.alt}
                      width={person.portrait.width}
                      height={person.portrait.height}
                      sizes="(max-width: 720px) 92vw, 520px"
                      className={styles.photo}
                    />
                  ) : (
                    <div className={styles.reserved} role="img" aria-label={`Portrait of ${person.name} coming soon`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/slmga-icon-dark.svg" alt="" width={120} height={40} className={styles.reservedMark} />
                      <span className={styles.reservedText}>Portrait coming soon</span>
                    </div>
                  )}
                  <span className={styles.light} aria-hidden="true" />
                </div>
                <figcaption className={styles.caption}>
                  <span className={styles.role}>{person.role}</span>
                  <span className={styles.name}>{person.name}</span>
                  {instagram[person.id] && <InstagramHandle {...instagram[person.id]} name={person.name} />}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
