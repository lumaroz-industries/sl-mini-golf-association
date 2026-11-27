"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { ImageAsset } from "@/content/schema";
import { MedalIcon, type MedalKind } from "./MedalDefs";
import s from "./WorldWall.module.css";

export interface WallResult {
  event: string;
  year: number;
  place?: string;
  medal?: MedalKind;
  position?: number;
}

export interface WallPlayer {
  slug: string;
  name: string;
  photo?: ImageAsset;
  district?: string;
  medals: { gold?: number; silver?: number; bronze?: number };
  total: number;
  /** Latest international results, newest first (at most three). */
  results: WallResult[];
  /** How many international results the player has in all. */
  resultCount: number;
}

const MEDALS: Array<{ kind: MedalKind; label: string }> = [
  { kind: "gold", label: "Gold" },
  { kind: "silver", label: "Silver" },
  { kind: "bronze", label: "Bronze" },
];

const ordinal = (n: number) => {
  const sx = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (sx[(v - 20) % 10] || sx[v] || sx[0]);
};

/** Ice lines of a globe: the "world stage" motif on both faces. */
function Globe({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" />
      {[14, 28, 40].map((rx) => (
        <ellipse key={rx} cx="50" cy="50" rx={rx} ry="48" />
      ))}
      {[-30, -15, 0, 15, 30].map((y) => (
        <ellipse key={y} cx="50" cy={50 + y} rx={Math.sqrt(48 * 48 - y * y)} ry={Math.max(2, 8 - Math.abs(y) / 6)} />
      ))}
    </svg>
  );
}

export type WallTheme = "international" | "national" | "state";

/** What changes with the theme: the seal's words, the back's labels. */
const THEME: Record<WallTheme, { seal: string; events: string; place: string }> = {
  international: { seal: "INTERNATIONAL ◆ MAHARASHTRA ◆", events: "International events", place: "Maharashtra · India" },
  national: { seal: "NATIONAL ◆ TEAM INDIA ◆ MAHARASHTRA ◆", events: "National events", place: "Maharashtra · India" },
  state: { seal: "STATE ◆ MAHARASHTRA ◆ SAHYADRI ◆", events: "State events", place: "Maharashtra" },
};

/** National: three flowing ribbons in the tricolour. */
function Ribbons({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-5 30 C 25 18, 45 42, 105 24" className={s.ribbonA} />
      <path d="M-5 42 C 25 30, 45 54, 105 36" className={s.ribbonB} />
      <path d="M-5 54 C 25 42, 45 66, 105 48" className={s.ribbonC} />
    </svg>
  );
}

/** State: the Sahyadri ridge, in layers. */
function Ridge({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 62 L10 50 L17 56 L27 40 L35 50 L44 36 L52 48 L61 34 L70 46 L78 38 L88 52 L100 42" className={s.ridgeA} />
      <path d="M0 74 L12 64 L20 70 L31 58 L40 66 L50 54 L58 64 L68 56 L77 66 L86 58 L100 68" className={s.ridgeB} />
      <path d="M0 86 L14 78 L24 84 L36 74 L48 82 L60 72 L72 80 L84 74 L100 82" className={s.ridgeC} />
    </svg>
  );
}

/** The theme's background motif: globe lines, tricolour ribbons or the Sahyadri ridge. */
function Motif({ theme, className }: { theme: WallTheme; className: string }) {
  if (theme === "national") return <Ribbons className={className} />;
  if (theme === "state") return <Ridge className={className} />;
  return <Globe className={className} />;
}

/** A slowly turning seal around a golf ball, with the level's words. */
function Seal({ text }: { text: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={s.seal} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id={`r${id}`} d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0" />
        <radialGradient id={`b${id}`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#dfe8ee" />
          <stop offset="1" stopColor="#8a9aa6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" className={s.sealRim} />
      <circle cx="50" cy="50" r="27" className={s.sealInner} />
      <g className={s.sealText}>
        <text>
          <textPath href={`#r${id}`} textLength="230">
            {text}
          </textPath>
        </text>
      </g>
      <circle cx="50" cy="50" r="15" fill={`url(#b${id})`} />
      {[
        [45, 45],
        [52, 43],
        [57, 49],
        [47, 52],
        [54, 55],
        [44, 58],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" className={s.sealDimple} />
      ))}
    </svg>
  );
}

function Front({ player, revealLabel, theme }: { player?: WallPlayer; revealLabel: string; theme: WallTheme }) {
  const [first, ...rest] = (player?.name ?? "").split(/\s+/);
  return (
    <>
      <div className={s.photo}>
        {player?.photo ? (
          <Image src={player.photo.src} alt={player.photo.alt} width={player.photo.width} height={player.photo.height} sizes="(max-width: 640px) 46vw, 260px" className={s.photoImg} draggable={false} />
        ) : (
          <div className={s.mystery}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-icon-dark.svg" alt="" width={120} height={40} />
            {!player && <span>{revealLabel}</span>}
          </div>
        )}
      </div>
      <Motif theme={theme} className={s.globe} />
      <span className={s.sheen} aria-hidden="true" />
      <span className={s.glare} aria-hidden="true" />

      <Seal text={THEME[theme].seal} />

      <div className={s.plate}>
        {player ? (
          <h3 className={s.name}>
            <span className={s.first}>{first}</span>
            {rest.length > 0 && <span className={s.last}>{rest.join(" ")}</span>}
          </h3>
        ) : (
          <p className={s.name}>
            <span className={s.first}>Player</span>
            <span className={s.last}>To be announced</span>
          </p>
        )}
        <span className={s.rule} aria-hidden="true" />
        <ul className={s.medals} aria-label="Medals">
          {MEDALS.map(({ kind, label }) => {
            const n = player?.medals[kind];
            return (
              <li key={kind}>
                <MedalIcon kind={kind} size={20} />
                <b>{n ?? "–"}</b>
                <span className="visually-hidden">{n === undefined ? `${label} medals not yet listed` : `${n} ${label.toLowerCase()}`}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function Back({ player, theme }: { player: WallPlayer; theme: WallTheme }) {
  const known = MEDALS.some(({ kind }) => player.medals[kind] !== undefined);
  return (
    <>
      {player.photo && (
        <div className={s.backPhoto} aria-hidden="true">
          <Image src={player.photo.src} alt="" width={player.photo.width} height={player.photo.height} sizes="(max-width: 640px) 46vw, 260px" />
        </div>
      )}
      <Motif theme={theme} className={s.backGlobe} />
      <span className={s.glare} aria-hidden="true" />
      <div className={s.backHead}>
        <span className={s.avatar}>
          {player.photo ? <Image src={player.photo.src} alt="" width={120} height={150} sizes="64px" /> : <b>{player.name[0]}</b>}
        </span>
        <span className={s.backWho}>
          <b>{player.name}</b>
          <span>{player.district ? `${player.district} · Maharashtra` : THEME[theme].place}</span>
        </span>
      </div>

      <div className={s.backMedals}>
        {MEDALS.map(({ kind, label }) => (
          <span key={kind} className={s.backMedal}>
            <MedalIcon kind={kind} size={30} />
            <b>{player.medals[kind] ?? "–"}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
      <p className={s.total}>
        {known ? (
          <>
            <b>{player.total}</b> {player.total === 1 ? "medal" : "medals"} in all
          </>
        ) : (
          "Medals to be listed"
        )}
      </p>

      <div className={s.events}>
        <span className={s.eventsLabel}>{THEME[theme].events}</span>
        {player.results.length > 0 ? (
          <ul>
            {player.results.map((r) => (
              <li key={`${r.year}-${r.event}`}>
                <span className={s.year}>{r.year}</span>
                <span className={s.event}>
                  {r.event}
                  {r.place && <small>{r.place}</small>}
                </span>
                {r.medal ? <MedalIcon kind={r.medal} size={14} /> : r.position ? <span className={s.pos}>{ordinal(r.position)}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.soon}>Event history coming soon.</p>
        )}
      </div>

      <Link href={`/players/${player.slug}`} className={s.profile} onClick={(e) => e.stopPropagation()}>
        View profile
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </Link>
    </>
  );
}


/**
 * Wall of fame: a level's players (International, National or State) as a
 * grid of cards (five across on PC, two side by side on phones), in the
 * level's own theme. Tapping a card turns it over to the medals and the
 * events at that level; tapping it again turns it back.
 */
export function WorldWall({ players, revealLabel, theme = "international" }: { players: WallPlayer[]; revealLabel: string; theme?: WallTheme }) {
  const [open, setOpen] = useState<string>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(undefined);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (players.length === 0) {
    return (
      <ul className={s.wall} data-theme={theme} data-empty aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className={s.cell} style={{ "--i": i } as React.CSSProperties}>
            <div className={s.card}>
              <div className={s.inner}>
                <div className={`${s.face} ${s.front}`}>
                  <Front revealLabel={revealLabel} theme={theme} />
                </div>
                <div className={`${s.face} ${s.back}`} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={s.wall} data-theme={theme}>
      {players.map((p, i) => {
        const flipped = open === p.slug;
        const toggle = () => setOpen(flipped ? undefined : p.slug);
        return (
          <li key={p.slug} className={s.cell} style={{ "--i": i } as React.CSSProperties}>
            <div className={s.card} data-flipped={flipped || undefined}>
              <div className={s.inner}>
                <div className={`${s.face} ${s.front}`} inert={flipped}>
                  <Front player={p} revealLabel={revealLabel} theme={theme} />
                  <button type="button" className={s.hit} aria-expanded={false} onClick={toggle}>
                    <span className="visually-hidden">Turn over {p.name}&apos;s card: medals and events</span>
                  </button>
                </div>
                {/* Tapping anywhere on the back (except the profile link) turns the card back. */}
                <div className={`${s.face} ${s.back}`} inert={!flipped} onClick={toggle}>
                  <Back player={p} theme={theme} />
                  <button type="button" className="visually-hidden" onClick={(e) => (e.stopPropagation(), toggle())}>
                    Turn {p.name}&apos;s card back
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
