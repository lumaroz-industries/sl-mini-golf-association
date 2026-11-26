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

/* ------------------------------------------------------------- world map
   /textures/world-dots.svg is a dotted world map (Natural Earth land,
   3° grid) centred on India, 240 × 88 units. Routes leave Maharashtra for
   the rest of the world: decoration, not a list of events. */
const MAP = { w: 240, h: 88 };
const HOME = { x: 118.5, y: 37.7 };
const DESTS = [
  { x: 74.7, y: 17.3 }, // Europe
  { x: 160, y: 26.7 }, // East Asia
  { x: 164.7, y: 70.7 }, // Australia
  { x: 84.7, y: 70.7 }, // Southern Africa
  { x: 104.7, y: 34 }, // Gulf
  { x: 14.7, y: 24 }, // Americas
  { x: 36.7, y: 60.7 }, // South America
];

function arc(to: { x: number; y: number }) {
  const mx = (HOME.x + to.x) / 2;
  const my = (HOME.y + to.y) / 2;
  const lift = Math.hypot(to.x - HOME.x, to.y - HOME.y) * 0.38;
  return `M${HOME.x} ${HOME.y}Q${mx.toFixed(1)} ${(my - lift).toFixed(1)} ${to.x} ${to.y}`;
}

function WorldMap({ view, className }: { view: "band" | "full"; className: string }) {
  const id = useId().replace(/:/g, "");
  const box = view === "band" ? "50 3 140 87.5" : `-2 -2 ${MAP.w + 4} ${MAP.h + 4}`;
  const dests = view === "band" ? DESTS.slice(0, 5) : DESTS;
  return (
    <svg className={className} viewBox={box} preserveAspectRatio={view === "band" ? "xMidYMid slice" : "xMidYMid meet"} aria-hidden="true">
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="-10" y="-10" width={MAP.w + 20} height={MAP.h + 20}>
          <image href="/textures/world-dots.svg" width={MAP.w} height={MAP.h} />
        </mask>
        <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="0.3">
          <stop offset="0" stopColor="#4a6d80" />
          <stop offset="0.42" stopColor="#86aec6" />
          <stop offset="0.48" stopColor="#ffffff" />
          <stop offset="0.52" stopColor="#ffd6ef" />
          <stop offset="0.58" stopColor="#86aec6" />
          <stop offset="1" stopColor="#4a6d80" />
        </linearGradient>
      </defs>
      {/* The dots, with a band of light sweeping across them. */}
      <g mask={`url(#m${id})`}>
        <rect className={s.mapShimmer} x={-MAP.w} y="-10" width={MAP.w * 3} height={MAP.h + 20} fill={`url(#g${id})`} />
      </g>
      <g className={s.routes}>
        {dests.map((d, i) => (
          <g key={i} style={{ "--r": i } as React.CSSProperties}>
            <path d={arc(d)} className={s.route} pathLength={100} />
            <path d={arc(d)} className={s.comet} pathLength={100} />
            <circle cx={d.x} cy={d.y} r="1.3" className={s.dest} />
          </g>
        ))}
      </g>
      <circle cx={HOME.x} cy={HOME.y} r="2.2" className={s.pulse} />
      <circle cx={HOME.x} cy={HOME.y} r="1.7" className={s.home} />
    </svg>
  );
}

/** A slowly turning seal: "International · Maharashtra" around a golf ball. */
function Seal() {
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
            INTERNATIONAL ◆ MAHARASHTRA ◆
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

/** A compass rose: the card's "navigation" mark, top right. */
function Compass() {
  return (
    <svg className={s.compass} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" className={s.compassRing} />
      <circle cx="20" cy="20" r="13" className={s.compassRing} />
      <path d="M20 3 23 20 20 37 17 20Z" className={s.compassNS} />
      <path d="M3 20 20 17 37 20 20 23Z" className={s.compassEW} />
      <path d="M20 3 23 20H17Z" className={s.compassN} />
      <circle cx="20" cy="20" r="1.8" className={s.compassPin} />
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
      <WorldMap view="band" className={s.band} />
      <span className={s.holo} aria-hidden="true" />

      <span className={s.coords} aria-hidden="true">
        19.75°N · 75.71°E
      </span>
      <Compass />
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

function Back({ player }: { player: WallPlayer }) {
  const known = MEDALS.some(({ kind }) => player.medals[kind] !== undefined);
  return (
    <>
      {player.photo && (
        <div className={s.backPhoto} aria-hidden="true">
          <Image src={player.photo.src} alt="" width={player.photo.width} height={player.photo.height} sizes="(max-width: 640px) 46vw, 240px" />
        </div>
      )}
      <div className={s.backHead}>
        <span className={s.avatar}>
          {player.photo ? <Image src={player.photo.src} alt="" width={120} height={150} sizes="64px" /> : <b>{player.name[0]}</b>}
        </span>
        <span className={s.backWho}>
          <b>{player.name}</b>
          <span>{player.district ? `${player.district} · Maharashtra` : "Maharashtra · India"}</span>
        </span>
      </div>

      <WorldMap view="full" className={s.backMap} />

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
 * Wall of fame: Maharashtra's international players as a grid of cards
 * (five across on PC, two side by side on phones). Tapping a card turns it
 * over to the medals and international events; tapping it again turns it
 * back.
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
          <li key={i} className={s.cell}>
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
      {players.map((p) => {
        const flipped = open === p.slug;
        const toggle = () => setOpen(flipped ? undefined : p.slug);
        return (
          <li key={p.slug} className={s.cell}>
            <div className={s.card} data-flipped={flipped || undefined}>
              <div className={s.inner}>
                <div className={`${s.face} ${s.front}`} inert={flipped}>
                  <Front player={p} revealLabel={revealLabel} />
                  <button type="button" className={s.hit} aria-expanded={false} onClick={toggle}>
                    <span className="visually-hidden">Turn over {p.name}&apos;s card: medals and events</span>
                  </button>
                </div>
                {/* Tapping anywhere on the back (except the profile link) turns the card back. */}
                <div className={`${s.face} ${s.back}`} inert={!flipped} onClick={toggle}>
                  <Back player={p} />
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
