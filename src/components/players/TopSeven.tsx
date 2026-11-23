"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Where each card sits in 3D for a given front ("focus") card.
 * Wide screens: cards keep their place in the line-up; the front card steps
 * forward and its neighbours slide outwards to make room.
 * Narrow screens: a cover-flow centred on the front card (swipe or tap).
 */
function place(pos: number, focus: number, wide: boolean) {
  const d = pos - focus;
  const ad = Math.abs(d);
  const x = wide ? pos * 168 + (d === 0 ? 0 : (Math.sign(d) * 70) / ad) : d * 62;
  const z = d === 0 ? 70 : -ad * 95;
  const r = Math.max(-34, Math.min(34, -d * 11));
  const s = d === 0 ? 1.04 : 1 - ad * 0.04;
  const b = d === 0 ? 1 : Math.max(0.42, 0.78 - ad * 0.1);
  return { x, z, r, s, b, zi: 100 - ad * 10 };
}

export function TopSeven({ slots, revealLabel }: TopSevenProps) {
  const [focus, setFocus] = useState(0);
  const [wide, setWide] = useState(true);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1000px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Pointer tilt + holo position on the front card (mouse only).
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--tx", `${((px - 0.5) * 16).toFixed(2)}deg`);
    el.style.setProperty("--ty", `${((0.5 - py) * 14).toFixed(2)}deg`);
  };
  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    for (const v of ["--mx", "--my", "--tx", "--ty"]) el.style.removeProperty(v);
  };

  return (
    <div
      className={styles.stage}
      onPointerLeave={(e) => e.pointerType === "mouse" && setFocus(0)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setFocus((f) => clamp(f - 1));
        if (e.key === "ArrowRight") setFocus((f) => clamp(f + 1));
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) setFocus((f) => clamp(f + (dx < 0 ? 1 : -1)));
      }}
    >
      <MedalDefs />
      <div className={styles.spot} aria-hidden="true" />
      <div className={styles.floor} aria-hidden="true" />
      <ul className={styles.lineup}>
        {slots.map((slot) => {
          const p = place(slot.pos, focus, wide);
          const front = slot.pos === focus;
          const label = slot.player ? slot.player.name : `${revealLabel} (${slot.side === "right" ? "right" : slot.side === "left" ? "left" : "centre"})`;
          return (
            <li
              key={slot.key}
              className={styles.slot}
              data-front={front || undefined}
              data-side={slot.side}
              style={
                {
                  "--x": `${p.x}px`,
                  "--z": `${p.z}px`,
                  "--r": `${p.r}deg`,
                  "--s": p.s,
                  "--b": p.b,
                  "--lit": front ? 1 : 0.2,
                  zIndex: p.zi,
                } as React.CSSProperties
              }
              onPointerEnter={(e) => e.pointerType === "mouse" && setFocus(slot.pos)}
              onPointerMove={front ? tilt : undefined}
              onPointerLeave={untilt}
            >
              <PlayerCard
                player={slot.player}
                revealLabel={revealLabel}
                priority={front}
                arrowHidden={!front}
                overlay={
                  <button
                    type="button"
                    className={styles.pick}
                    aria-label={`Bring ${label} to the front`}
                    aria-pressed={front}
                    onClick={() => setFocus(slot.pos)}
                    onFocus={() => setFocus(slot.pos)}
                  />
                }
              />
            </li>
          );
        })}
      </ul>
      <p className={styles.hint} aria-hidden="true">
        {wide ? "Hover a card to bring it forward · ↗ opens the player" : "Tap or swipe to bring a card forward · ↗ opens the player"}
      </p>
    </div>
  );
}
