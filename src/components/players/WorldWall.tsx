"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  topSeven: boolean;
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

/** A slowly turning seal: "International · Maharashtra" around a golf ball. */
function Seal() {
  return (
    <svg className={s.seal} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id="wall-seal-ring" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0" />
        <radialGradient id="wall-seal-ball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#dfe8ee" />
          <stop offset="1" stopColor="#8a9aa6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" className={s.sealRim} />
      <circle cx="50" cy="50" r="27" className={s.sealInner} />
      <g className={s.sealText}>
        <text>
          <textPath href="#wall-seal-ring" textLength="230">
            INTERNATIONAL ◆ MAHARASHTRA ◆
          </textPath>
        </text>
      </g>
      <circle cx="50" cy="50" r="15" fill="url(#wall-seal-ball)" />
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

function Front({ player, revealLabel }: { player?: WallPlayer; revealLabel: string }) {
  const [first, ...rest] = (player?.name ?? "").split(/\s+/);
  return (
    <>
      <div className={s.photo}>
        {player?.photo ? (
          <Image src={player.photo.src} alt={player.photo.alt} width={player.photo.width} height={player.photo.height} sizes="(max-width: 640px) 46vw, 240px" className={s.photoImg} draggable={false} />
        ) : (
          <div className={s.mystery}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-icon-dark.svg" alt="" width={120} height={40} />
            {!player && <span>{revealLabel}</span>}
          </div>
        )}
      </div>
      <Globe className={s.globe} />
      <span className={s.sheen} aria-hidden="true" />

      <div className={s.top} aria-hidden="true">
        <span className={s.tag}>
          <i className={s.flag} />
          Intl
        </span>
        {player?.topSeven && <span className={s.top7}>Top 7</span>}
      </div>

      <Seal />

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

function Back({ player, onClose }: { player: WallPlayer; onClose: () => void }) {
  const known = MEDALS.some(({ kind }) => player.medals[kind] !== undefined);
  return (
    <>
      {player.photo && (
        <div className={s.backPhoto} aria-hidden="true">
          <Image src={player.photo.src} alt="" width={player.photo.width} height={player.photo.height} sizes="(max-width: 640px) 46vw, 240px" />
        </div>
      )}
      <Globe className={s.backGlobe} />
      <div className={s.backHead}>
        <span className={s.avatar}>
          {player.photo ? <Image src={player.photo.src} alt="" width={120} height={150} sizes="64px" /> : <b>{player.name[0]}</b>}
        </span>
        <span className={s.backWho}>
          <b>{player.name}</b>
          <span>{player.district ? `${player.district} · Maharashtra` : "Maharashtra"}</span>
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
      <p className={s.total}>{known ? <><b>{player.total}</b> {player.total === 1 ? "medal" : "medals"} in all</> : "Medals to be listed"}</p>

      <div className={s.events}>
        <span className={s.eventsLabel}>International events</span>
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

      <div className={s.backFoot}>
        <Link href={`/players/${player.slug}`} className={s.profile}>
          Profile
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </Link>
        <button type="button" className={s.turn} onClick={onClose} aria-label={`Turn ${player.name}'s card back over`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </>
  );
}

/**
 * Wall of fame: Maharashtra's international players as a grid of cards
 * (five across on PC, two side by side on phones). A card lifts on hover;
 * tapping it turns it over to the medals and international events.
 */
export function WorldWall({ players, revealLabel }: { players: WallPlayer[]; revealLabel: string }) {
  const [open, setOpen] = useState<string>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(undefined);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (players.length === 0) {
    return (
      <ul className={s.wall} data-empty aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className={s.cell} style={{ "--i": i } as React.CSSProperties}>
            <div className={s.card}>
              <div className={s.inner}>
                <div className={`${s.face} ${s.front}`}>
                  <Front revealLabel={revealLabel} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={s.wall}>
      {players.map((p, i) => {
        const flipped = open === p.slug;
        return (
          <li key={p.slug} className={s.cell} style={{ "--i": i } as React.CSSProperties}>
            <div className={s.card} data-flipped={flipped || undefined}>
              <div className={s.inner}>
                <div className={`${s.face} ${s.front}`} inert={flipped}>
                  <Front player={p} revealLabel={revealLabel} />
                  <button type="button" className={s.hit} aria-expanded={flipped} onClick={() => setOpen(p.slug)}>
                    <span className="visually-hidden">Turn over {p.name}&apos;s card: medals and events</span>
                  </button>
                  <span className={s.hint} aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </span>
                </div>
                <div className={`${s.face} ${s.back}`} inert={!flipped}>
                  <Back player={p} onClose={() => setOpen(undefined)} />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
