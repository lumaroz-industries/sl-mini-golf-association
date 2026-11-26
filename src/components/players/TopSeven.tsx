"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MedalDefs } from "./MedalDefs";
import { PlayerCard } from "./PlayerCard";
import type { Slot } from "./types";
import styles from "./TopSeven.module.css";

interface TopSevenProps {
  slots: Slot[];
  revealLabel: string;
}

const MIN = -3;
const MAX = 3;
const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));
const MOBILE_STEP = 66;
/** Hover must rest on a card this long before it comes forward (stops flicker on quick sweeps). */
const HOVER_INTENT_MS = 110;

/* Critically damped spring: quick, glides in and stops without any wobble. */
const STIFFNESS = 180;
const DAMPING = 27;

type Pose = { x: number; z: number; r: number; s: number; dim: number };
const KEYS: Array<keyof Pose> = ["x", "z", "r", "s", "dim"];

/**
 * Pose of a card for a (possibly fractional, while dragging) front position.
 * Wide screens: cards keep their place in the line-up; the front card steps
 * forward and its neighbours slide outwards. Narrow screens: a cover-flow
 * centred on the front card.
 */
function pose(pos: number, focus: number, wide: boolean): Pose {
  const d = pos - focus;
  const ad = Math.abs(d);
  const near = Math.min(1, ad); // 0 at the front, 1 from one place away
  const push = wide ? Math.sign(d) * (70 / Math.max(1, ad)) * near : 0;
  return {
    x: wide ? pos * 168 + push : d * MOBILE_STEP,
    z: 70 - near * 70 - ad * 95,
    r: Math.max(-34, Math.min(34, -d * 11)),
    s: 1.04 - near * 0.04 - ad * 0.04,
    dim: Math.min(0.58, near * 0.22 + ad * 0.1),
  };
}

export function TopSeven({ slots, revealLabel }: TopSevenProps) {
  const [front, setFront] = useState(0);
  const [wide, setWide] = useState(true);
  const els = useRef<Array<HTMLLIElement | null>>([]);
  const shades = useRef<Array<HTMLSpanElement | null>>([]);
  const tiltFrame = useRef(0);
  const target = useRef(0); // front position the springs head for (fractional while dragging)
  const current = useRef<Array<Pose & { v: Pose }>>([]);
  const raf = useRef(0);
  const reduced = useRef(false);
  const hoverTimer = useRef(0);
  const drag = useRef<{ x: number; y: number; from: number; active: boolean } | null>(null);
  const justSwiped = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1000px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setWide(mq.matches);
      reduced.current = rm.matches;
    };
    update();
    mq.addEventListener("change", update);
    rm.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      rm.removeEventListener("change", update);
    };
  }, []);

  const write = (i: number, p: Pose) => {
    const el = els.current[i];
    if (!el) return;
    el.style.transform = `translate3d(calc(-50% + ${p.x.toFixed(2)}px), 0, ${p.z.toFixed(2)}px) rotateY(${p.r.toFixed(3)}deg) scale(${p.s.toFixed(4)})`;
    // Opacity set on the shade itself: a custom property here would make the
    // browser restyle the whole card on every frame.
    const shade = shades.current[i];
    if (shade) shade.style.opacity = p.dim.toFixed(3);
  };

  /** One spring step for every card; keeps running until everything settles. */
  const tick = useCallback(
    function step(now: number, last = now) {
      const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60);
      let moving = false;
      slots.forEach((slot, i) => {
        const goal = pose(slot.pos, target.current, wide);
        const c = (current.current[i] ??= { ...goal, v: { x: 0, z: 0, r: 0, s: 0, dim: 0 } });
        for (const k of KEYS) {
          if (reduced.current) {
            c[k] = goal[k];
            c.v[k] = 0;
            continue;
          }
          const a = STIFFNESS * (goal[k] - c[k]) - DAMPING * c.v[k];
          c.v[k] += a * dt;
          c[k] += c.v[k] * dt;
          const scale = k === "s" || k === "dim" ? 0.0005 : 0.05;
          if (Math.abs(goal[k] - c[k]) > scale || Math.abs(c.v[k]) > scale) moving = true;
          else {
            c[k] = goal[k];
            c.v[k] = 0;
          }
        }
        write(i, c);
      });
      raf.current = moving ? requestAnimationFrame((t) => step(t, now)) : 0;
    },
    [slots, wide],
  );

  const kick = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame((t) => tick(t));
  }, [tick]);

  // Initial placement (no animation) and re-layout on breakpoint changes.
  useEffect(() => {
    current.current = slots.map((s) => ({ ...pose(s.pos, target.current, wide), v: { x: 0, z: 0, r: 0, s: 0, dim: 0 } }));
    current.current.forEach((p, i) => write(i, p));
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [slots, wide]);

  const bringForward = useCallback(
    (pos: number) => {
      const p = clamp(pos);
      target.current = p;
      setFront(p);
      kick();
    },
    [kick],
  );

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // Pointer tilt on the front card (mouse only): the card's own transform,
  // once per frame, eased by its CSS transition.
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const card = e.currentTarget.firstElementChild as HTMLElement | null;
    if (!card) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = requestAnimationFrame(() => {
      card.style.transform = `rotateX(${((0.5 - py) * 14).toFixed(2)}deg) rotateY(${((px - 0.5) * 16).toFixed(2)}deg)`;
    });
  };
  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    cancelAnimationFrame(tiltFrame.current);
    const card = e.currentTarget.firstElementChild as HTMLElement | null;
    if (card) card.style.transform = "";
  };

  return (
    <div
      className={styles.stage}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(hoverTimer.current);
        bringForward(0);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") bringForward(front - 1);
        if (e.key === "ArrowRight") bringForward(front + 1);
      }}
      // Touch: the line-up follows the finger, then glides to the nearest card.
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        drag.current = { x: e.clientX, y: e.clientY, from: target.current, active: false };
      }}
      onPointerMove={(e) => {
        const g = drag.current;
        if (!g) return;
        const dx = e.clientX - g.x;
        const dy = e.clientY - g.y;
        if (!g.active) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
          g.active = true;
        }
        const step = wide ? 168 : MOBILE_STEP * 1.6;
        target.current = Math.max(MIN - 0.35, Math.min(MAX + 0.35, g.from - dx / step));
        kick();
      }}
      onPointerUp={() => {
        const g = drag.current;
        drag.current = null;
        if (g?.active) {
          justSwiped.current = true;
          window.setTimeout(() => (justSwiped.current = false), 0);
          bringForward(Math.round(target.current));
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        bringForward(Math.round(target.current));
      }}
      onClickCapture={(e) => {
        // A swipe should not also count as a tap on the card under the finger.
        if (justSwiped.current) e.stopPropagation();
      }}
    >
      <MedalDefs />
      <div className={styles.spot} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <ul className={styles.lineup}>
        {slots.map((slot, i) => {
          const isFront = slot.pos === front;
          const label = slot.player ? slot.player.name : `${revealLabel} (${slot.side === "right" ? "right" : slot.side === "left" ? "left" : "centre"})`;
          return (
            <li
              key={slot.key}
              ref={(el) => {
                els.current[i] = el;
              }}
              className={styles.slot}
              data-front={isFront || undefined}
              data-side={slot.side}
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse") return;
                window.clearTimeout(hoverTimer.current);
                hoverTimer.current = window.setTimeout(() => bringForward(slot.pos), HOVER_INTENT_MS);
              }}
              onPointerMove={isFront ? tilt : undefined}
              onPointerLeave={(e) => {
                untilt(e);
                window.clearTimeout(hoverTimer.current);
              }}
            >
              <PlayerCard
                player={slot.player}
                revealLabel={revealLabel}
                priority={isFront}
                active={isFront}
                arrowHidden={!isFront}
                overlay={
                  <button
                    type="button"
                    className={styles.pick}
                    aria-label={`Bring ${label} to the front`}
                    aria-pressed={isFront}
                    onClick={() => bringForward(slot.pos)}
                    onFocus={() => bringForward(slot.pos)}
                  />
                }
              />
              <span
                className={styles.shade}
                ref={(el) => {
                  shades.current[i] = el;
                }}
                aria-hidden="true"
              />
              <span className={styles.shadow} aria-hidden="true" />
            </li>
          );
        })}
      </ul>
      {!wide && (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.navPrev}`}
            aria-label="Previous card"
            disabled={front <= MIN}
            onClick={() => bringForward(front - 1)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.navNext}`}
            aria-label="Next card"
            disabled={front >= MAX}
            onClick={() => bringForward(front + 1)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </>
      )}
      <p className={styles.hint} aria-hidden="true">
        {wide ? "Hover a card to bring it forward · ↗ opens the player" : "Use the arrows, swipe or tap a card · ↗ opens the player"}
      </p>
    </div>
  );
}
