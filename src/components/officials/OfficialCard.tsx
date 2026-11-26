import Image from "next/image";
import type { Official } from "@/content/schema";
import s from "./Officials.module.css";

/**
 * An official's card — everything about them is on the card (they have no
 * page of their own). Provisional design: the final card is designed later.
 * Without an official it is an empty "to be announced" slot.
 */
export function OfficialCard({ official, revealLabel, role }: { official?: Official; revealLabel: string; role?: string }) {
  if (!official) {
    return (
      <article className={s.card} data-empty="">
        <div className={s.photo}>
          <span className={s.silhouette} aria-hidden="true" />
        </div>
        <div className={s.body}>
          <span className={s.role}>{role ?? "Official"}</span>
          <span className={s.name}>{revealLabel}</span>
        </div>
      </article>
    );
  }
  const initials = official.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <article className={s.card} aria-label={`${official.name}, ${official.role}`}>
      <div className={s.photo}>
        {official.photo ? (
          <Image src={official.photo.src} alt={official.photo.alt} width={official.photo.width} height={official.photo.height} sizes="(max-width: 640px) 46vw, 280px" />
        ) : (
          <span className={s.initials}>{initials}</span>
        )}
      </div>
      <div className={s.body}>
        <span className={s.role}>{official.role}</span>
        <h3 className={s.name}>{official.name}</h3>
        {official.organisation && <span className={s.org}>{official.organisation}</span>}
        {(official.district || official.since) && (
          <span className={s.meta}>{[official.district, official.since && `Since ${official.since}`].filter(Boolean).join(" · ")}</span>
        )}
        {official.bio && <p className={s.bio}>{official.bio}</p>}
        {(official.instagram || official.email) && (
          <span className={s.links}>
            {official.instagram && (
              <a href={official.instagram} target="_blank" rel="noopener noreferrer">
                Instagram ↗
              </a>
            )}
            {official.email && <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(official.email)}`} target="_blank" rel="noopener noreferrer">Email ↗</a>}
          </span>
        )}
      </div>
    </article>
  );
}
