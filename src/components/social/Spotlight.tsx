"use client";

import { useRef } from "react";
import styles from "./Social.module.css";

/**
 * Card grid whose emerald light follows the pointer. Purely decorative: it
 * only sets CSS variables, and does nothing on touch or with reduced motion.
 */
export function Spotlight({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const onMove = (e: React.PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse") return;
    const card = (e.target as HTMLElement).closest<HTMLElement>(`.${styles.profile}, .${styles.channel}`);
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <ul ref={ref} className={className} onPointerMove={onMove}>
      {children}
    </ul>
  );
}
