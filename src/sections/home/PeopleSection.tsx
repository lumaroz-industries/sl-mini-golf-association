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
  /** Founder and website designer ids, for their card's emblem and signature line. */
  credits?: { ownerId: string; developerId: string };
}

/**
 * 05 — The people behind the platform: black premium collectible cards in
 * each person's finish (gold for the founder, diamond for the designer) —
 * an obsidian body with a metal edge, their cut-out rising into light with
 * their name drawn large behind them, and the name in a metal finish.
 * A person without a real photo gets a reserved branded frame — never a
 * generated face.
 */
export function PeopleSection({ content, people, instagram = {}, style = {}, credits }: PeopleSectionProps) {
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
            const isDev = credits?.developerId === person.id;
            const isOwner = credits?.ownerId === person.id;
            const emblem = isDev ? "Designer" : isOwner ? "Founder" : person.role.split(/[\s&]+/)[0];
            const signature = isDev ? "Designed & built this website" : isOwner ? "Founder of SL Mini Golf Association" : undefined;
            const roles = person.role.split(/\s*&\s*/);
            return (
              <Reveal as="li" key={person.id} index={i} className={styles.item}>
                <figure className={styles.card} data-finish={look.finish ?? "silver"}>
                  <span className={styles.edge} aria-hidden="true" />
                  <div className={styles.body}>
                    <span className={styles.facets} aria-hidden="true" />
                    <span className={styles.rays} aria-hidden="true" />
                    <span className={styles.halo} aria-hidden="true" />
                    <span className={styles.ghost} aria-hidden="true">
                      {person.nickname ?? first}
                    </span>
                    {photo ? (
                      <Image
                        src={photo.src}
                        alt={person.portrait?.alt ?? person.name}
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 720px) 80vw, 460px"
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
                    <span className={styles.shine} aria-hidden="true" />
                    <span className={styles.frame} aria-hidden="true" />
                    <span className={styles.corners} aria-hidden="true" />

                    <div className={styles.top} aria-hidden="true">
                      <span className={styles.number}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={styles.emblem}>
                        <i>◆</i>
                        {emblem}
                      </span>
                    </div>

                    <figcaption className={styles.plate}>
                      <span className={styles.name}>
                        <span className={styles.first}>{first}</span>
                        {rest.length > 0 && <span className={styles.last}>{rest.join(" ")}</span>}
                      </span>
                      <span className={styles.rule} aria-hidden="true" />
                      <span className={styles.chips}>
                        {roles.map((r) => (
                          <span key={r} className={styles.chip}>
                            {r}
                          </span>
                        ))}
                      </span>
                      <span className={styles.foot}>
                        {instagram[person.id] && <InstagramHandle {...instagram[person.id]} name={person.name} />}
                        {signature && <span className={styles.signature}>{signature}</span>}
                      </span>
                    </figcaption>
                  </div>
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
