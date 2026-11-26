import Image from "next/image";
import type { Official } from "@/content/schema";
import s from "./OfficialCard.module.css";

/** Initials of a name, skipping titles like "Dr.". */
function initialsOf(name: string) {
  const w = name.split(/\s+/).filter((x) => x && !/^(dr|mr|mrs|ms|shri|smt)\.?$/i.test(x));
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

/** "Minigolf Federation of India" → "MFI" (when no short name is given). */
function shortOf(org: string) {
  return org
    .split(/\s+/)
    .filter((w) => w && !/^(of|and|the|&)$/i.test(w))
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 5);
}

/** An embossed seal: "Official" round a golf flag, in the card's metal. */
function Seal({ text }: { text: string }) {
  return (
    <svg className={s.seal} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id="official-seal-ring" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" />
      </defs>
      <circle cx="50" cy="50" r="48" className={s.sealRim} />
      <circle cx="50" cy="50" r="43" className={s.sealLine} />
      <circle cx="50" cy="50" r="27" className={s.sealLine} />
      <text className={s.sealText}>
        <textPath href="#official-seal-ring" textLength="222" lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
      {/* A golf flag on a green: the sport's own emblem. */}
      <ellipse cx="50" cy="64" rx="14" ry="3.2" className={s.sealMark} />
      <path d="M48 64V34" className={s.sealPole} />
      <path d="M48.5 34.5 64 40l-15.5 5.5Z" className={s.sealMark} />
      <circle cx="41" cy="61.5" r="2.6" className={s.sealMark} />
    </svg>
  );
}

/**
 * An official's card, in the shape of an official credential: a lanyard
 * slot, an "Official" header with the body's short name and the level, a
 * framed ID photo with an embossed seal, the name and position like a title,
 * and ID-style rows (organisation, district, since). A fine guilloché
 * pattern and a line of microprint, as on certificates and banknotes. The
 * level's colours (tricolour for India, saffron for Maharashtra) come from
 * the section it sits in. Everything about the official is on the card.
 * Without an official it is a "to be announced" credential.
 */
export function OfficialCard({ official, revealLabel, role, levelName, orgShort }: { official?: Official; revealLabel: string; role?: string; levelName: string; orgShort?: string }) {
  const short = orgShort ?? (official?.organisation ? shortOf(official.organisation) : undefined);
  const rows = official
    ? [
        ["Organisation", official.organisation],
        ["District", official.district],
        ["Since", official.since ? String(official.since) : undefined],
      ].filter((r): r is [string, string] => Boolean(r[1]))
    : [];
  const micro = `${(official?.organisation ?? levelName).toUpperCase()} · OFFICIAL · `;

  return (
    <article className={s.card} id={official ? `official-${official.id}` : undefined} data-empty={!official || undefined} aria-label={official ? `${official.name}, ${official.role}` : undefined}>
      <div className={s.face}>
        <span className={s.guilloche} aria-hidden="true" />
        <span className={s.slot} aria-hidden="true" />

        <header className={s.head}>
          <span className={s.badge}>
            <b>Official</b>
            {short && <span>{short}</span>}
          </span>
          <span className={s.level}>
            <i aria-hidden="true" />
            {levelName}
          </span>
        </header>

        <div className={s.photo}>
          {official?.photo ? (
            <Image src={official.photo.src} alt={official.photo.alt} width={official.photo.width} height={official.photo.height} sizes="(max-width: 640px) 40vw, 260px" />
          ) : official ? (
            <span className={s.monogram}>{initialsOf(official.name)}</span>
          ) : (
            <span className={s.silhouette} aria-hidden="true" />
          )}
          <span className={s.photoShade} aria-hidden="true" />
        </div>
        <Seal text={`OFFICIAL ◆ ${short ?? "MINI GOLF"} ◆ OFFICIAL ◆ ${short ?? "MINI GOLF"} ◆ `} />

        <div className={s.plate}>
          {official ? <h3 className={s.name}>{official.name}</h3> : <p className={s.name}>{revealLabel}</p>}
          <p className={s.role}>
            <span>{official?.role ?? role ?? "Official"}</span>
          </p>
          {rows.length > 0 && (
            <dl className={s.rows}>
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {official?.bio && <p className={s.bio}>{official.bio}</p>}
          {(official?.instagram || official?.email) && (
            <span className={s.links}>
              {official.instagram && (
                <a href={official.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram ↗
                </a>
              )}
              {official.email && (
                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(official.email)}`} target="_blank" rel="noopener noreferrer">
                  Email ↗
                </a>
              )}
            </span>
          )}
        </div>

        <span className={s.micro} aria-hidden="true">
          {micro.repeat(6)}
        </span>
      </div>
    </article>
  );
}
