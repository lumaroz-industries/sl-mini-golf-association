import Image from "next/image";
import Link from "next/link";
import { MedalIcon, type MedalKind } from "./MedalDefs";
import type { CardPlayer } from "./types";
import { mhFont } from "./fonts";
import styles from "./PlayerCard.module.css";

interface PlayerCardProps {
  player?: CardPlayer;
  revealLabel: string;
  /** Large static card on a player's own page. */
  large?: boolean;
  priority?: boolean;
  /** Rendered over the card body but under the profile arrow. */
  overlay?: React.ReactNode;
  /** Hide the profile arrow (cards behind the front one). */
  arrowHidden?: boolean;
  /** Front/featured card: runs the foil animation. */
  active?: boolean;
}

const MEDALS: Array<{ kind: MedalKind; label: string }> = [
  { kind: "gold", label: "Gold" },
  { kind: "silver", label: "Silver" },
  { kind: "bronze", label: "Bronze" },
];

/**
 * Collectible-style player card: photo, name and medal counts — nothing
 * else. Cards without an announced player show the SL mark and "Reveal soon".
 */
export function PlayerCard({ player, revealLabel, large = false, priority = false, overlay, arrowHidden = false, active = true }: PlayerCardProps) {
  const [first, ...rest] = (player?.name ?? "").split(/\s+/);
  return (
    <div className={styles.card} data-large={large || undefined} data-empty={!player || undefined} data-arrow-hidden={arrowHidden || undefined} data-active={active || undefined}>
      <div className={styles.foil} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.photo}>
          {player?.photo ? (
            <Image
              src={player.photo.src}
              alt={player.photo.alt}
              width={player.photo.width}
              height={player.photo.height}
              sizes={large ? "(max-width: 760px) 80vw, 420px" : "(max-width: 760px) 64vw, 300px"}
              priority={priority}
              className={styles.photoImg}
              draggable={false}
            />
          ) : (
            <div className={styles.mystery} aria-hidden={!player}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/slmga-icon-dark.svg" alt="" width={120} height={40} className={styles.mysteryMark} />
              {!player && <span className={styles.mysteryLabel}>{revealLabel}</span>}
            </div>
          )}
          <span className={styles.photoFade} aria-hidden="true" />
        </div>

        <div className={styles.top} aria-hidden="true">
          <span className={styles.badge}>Top 7</span>
          {/* Maharashtra: "MH" on a saffron swallowtail pennant (Maratha-flag inspired). */}
          <span className={styles.state} title="Maharashtra">
            <svg className={styles.pennant} viewBox="0 0 64 34" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="mh-saffron" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffb347" />
                  <stop offset="0.45" stopColor="#ff8a1f" />
                  <stop offset="1" stopColor="#d9580a" />
                </linearGradient>
              </defs>
              <path d="M2 2h60l-9 7.5 9 7.5-9 7.5 9 7.5H2z" fill="url(#mh-saffron)" />
              <path d="M2 2h60l-9 7.5 9 7.5-9 7.5 9 7.5H2z" fill="none" stroke="rgb(255 236 200 / 0.55)" strokeWidth="1" />
            </svg>
            <span className={`${styles.stateText} ${mhFont.className}`}>MH</span>
          </span>
        </div>

        <div className={styles.plate}>
          {player ? (
            <h3 className={styles.name}>
              <span className={styles.first}>{first}</span>
              {rest.length > 0 && <span className={styles.last}>{rest.join(" ")}</span>}
            </h3>
          ) : (
            <p className={`${styles.name} ${styles.nameEmpty}`}>
              <span className={styles.first}>Player</span>
              <span className={styles.last}>To be announced</span>
            </p>
          )}

          <ul className={styles.medals} aria-label="Medals">
            {MEDALS.map(({ kind, label }) => {
              const n = player?.medals[kind];
              return (
                <li key={kind} className={styles.medal} data-kind={kind}>
                  <MedalIcon kind={kind} size={large ? 30 : 24} />
                  <b className={styles.count}>{n ?? "–"}</b>
                  <span className="visually-hidden">
                    {n === undefined ? `${label} medals not yet listed` : `${n} ${label.toLowerCase()} ${n === 1 ? "medal" : "medals"}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

      </div>

      {overlay && <div className={styles.overlay}>{overlay}</div>}

      {player && !large && (
        <Link
          href={`/players/${player.slug}`}
          className={styles.arrow}
          aria-label={`View ${player.name}'s profile`}
          tabIndex={arrowHidden ? -1 : undefined}
          aria-hidden={arrowHidden || undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </Link>
      )}
    </div>
  );
}
