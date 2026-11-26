import Image from "next/image";
import Link from "next/link";
import { MedalIcon, type MedalKind } from "./MedalDefs";
import type { CardPlayer } from "./types";
import people from "@/content/sources/local/people.json";
import site from "@/content/sources/local/site.json";
import styles from "./PlayerCard.module.css";

/** The card's designer, credited small at the foot of every card (like the artist line on collectible cards). */
const DESIGNER = people.find((p) => p.id === site.credits.developerId)?.name;

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
  /** Label in the top-left plaque (default "Top 7"). */
  badge?: string;
  /** Front/featured card (the line-up marks the card in front). */
  active?: boolean;
}

/** The three card designs, chosen per player in the admin. */
const TIERS = { state: "State", national: "National", international: "International" } as const;

const MEDALS: Array<{ kind: MedalKind; label: string }> = [
  { kind: "gold", label: "Gold" },
  { kind: "silver", label: "Silver" },
  { kind: "bronze", label: "Bronze" },
];

/**
 * Collectible-style player card: photo, name and medal counts. Three designs
 * (set per player in the admin): State (saffron and deep red with gold),
 * National (gold with a tricolour band) and International (diamond —
 * platinum, a faceted lattice and prismatic light). All share a black
 * premium body with golf details: the level flown on a golf flag, a
 * ball-dimple texture, putting-green contours, a hole with its flag and a
 * golf ball set in the rule.
 * Cards without an announced player show the SL mark and "Reveal soon".
 */
export function PlayerCard({ player, revealLabel, large = false, priority = false, overlay, arrowHidden = false, active = true, badge = "Top 7" }: PlayerCardProps) {
  const [first, ...rest] = (player?.name ?? "").split(/\s+/);
  const tier = player?.card ?? "state";
  return (
    <div className={styles.card} data-card={tier} data-large={large || undefined} data-empty={!player || undefined} data-arrow-hidden={arrowHidden || undefined} data-active={active || undefined}>
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

        {/* Golf details and the design's own motif. */}
        <span className={styles.dimples} aria-hidden="true" />
        <svg className={styles.contours} viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse key={i} cx="62" cy="64" rx={18 + i * 11} ry={9 + i * 6} />
          ))}
        </svg>
        {/* A putting green's hole and flag, in fine line art behind the medals. */}
        <svg className={styles.hole} viewBox="0 0 60 50" aria-hidden="true">
          <ellipse cx="30" cy="44" rx="26" ry="5" />
          <ellipse cx="30" cy="44" rx="6" ry="1.6" className={styles.cup} />
          <path d="M30 44V8" />
          <path d="M30 9l15 5-15 5" className={styles.holeFlag} />
        </svg>
        {tier === "state" && (
          <svg className={styles.ridge} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 20 L0 14 L8 9 L13 12 L21 5 L27 10 L33 7 L40 12 L47 4 L53 9 L58 6 L66 11 L72 3 L79 9 L85 7 L92 12 L100 8 L100 20 Z" />
          </svg>
        )}
        {tier === "national" && <span className={styles.tricolour} aria-hidden="true" />}
        {tier === "international" && <span className={styles.facets} aria-hidden="true" />}
        <span className={styles.shine} aria-hidden="true" />

        <span className={styles.corners} aria-hidden="true" />

        <div className={styles.top} aria-hidden="true">
          <span className={styles.badge}><span>{badge}</span></span>
          {/* The level, flown on a golf flag. */}
          <span className={styles.flag}>
            <i className={styles.pin} />
            <span className={styles.pennant}>{TIERS[tier]}</span>
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

          <span className={styles.rule} aria-hidden="true" />

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

          {DESIGNER && (
            <span className={styles.credit}>
              <span className={styles.creditLabel}>Card designed by</span> {DESIGNER}
            </span>
          )}
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
