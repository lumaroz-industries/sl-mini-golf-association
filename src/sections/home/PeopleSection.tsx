import Image from "next/image";
import type { HomeContent, Person } from "@/content/schema";
import type { PersonFinish } from "@/content/repository";
import type { ImageAsset } from "@/content/schema";
import { Reveal } from "@/components/ui/Reveal";
import { InstagramHandle } from "@/components/ui/InstagramHandle";
import styles from "./PeopleSection.module.css";

interface PeopleSectionProps {
  content: HomeContent["people"];
  people: Person[];
  instagram?: Record<string, { url: string; handle: string }>;
  /** Each person's finish and cut-out photo (from their Social Media card). */
  style?: Record<string, { finish?: PersonFinish; cutout?: ImageAsset }>;
}

/**
 * 05 — The people behind the platform, as collectible-style cards that match
 * the homepage opening: each person in their own finish (gold, diamond …),
 * their cut-out portrait standing in a pool of light, their name in a
 * metallic finish. Same size for everyone. A person without a real photo gets
 * a reserved branded frame — never a generated face.
 */
export function PeopleSection({ content, people, instagram = {}, style = {} }: PeopleSectionProps) {
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
          {people.map((person, i) => {
            const look = style[person.id] ?? {};
            const photo = look.cutout ?? person.portrait;
            const [first, ...rest] = person.name.split(" ");
            return (
              <Reveal as="li" key={person.id} index={i} className={styles.card} data-finish={look.finish ?? "silver"}>
                <figure className={styles.figure}>
                  <div className={styles.stage}>
                    <span className={styles.ghost} aria-hidden="true">
                      {first}
                    </span>
                    <span className={styles.number} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/slmga-icon-dark.svg" alt="" width={56} height={20} className={styles.mark} aria-hidden="true" />
                    {photo ? (
                      <Image
                        src={photo.src}
                        alt={person.portrait?.alt ?? person.name}
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 720px) 92vw, 520px"
                        quality={92}
                        className={look.cutout ? styles.cutout : styles.photo}
                      />
                    ) : (
                      <div className={styles.reserved} role="img" aria-label={`Portrait of ${person.name} coming soon`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/slmga-icon-dark.svg" alt="" width={120} height={40} className={styles.reservedMark} />
                        <span className={styles.reservedText}>Portrait coming soon</span>
                      </div>
                    )}
                    <span className={styles.fade} aria-hidden="true" />
                  </div>
                  <figcaption className={styles.caption}>
                    <span className={styles.role}>
                      <i aria-hidden="true" />
                      {person.role}
                    </span>
                    <span className={styles.name}>
                      <span>{first}</span> <span>{rest.join(" ")}</span>
                    </span>
                    {instagram[person.id] && <InstagramHandle {...instagram[person.id]} name={person.name} />}
                  </figcaption>
                </figure>
                <span className={styles.sheen} aria-hidden="true" />
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
