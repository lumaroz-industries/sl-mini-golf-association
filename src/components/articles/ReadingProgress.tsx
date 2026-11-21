"use client";

import { useEffect, useRef } from "react";
import styles from "./Articles.module.css";

/**
 * A thin emerald line along the top with a golf ball rolling across it; the
 * ball drops into the cup when the article is finished.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    const bar = ref.current;
    if (!el || !bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      bar.style.setProperty("--p", p.toFixed(4));
      bar.toggleAttribute("data-done", p >= 0.995);
      bar.toggleAttribute("data-started", p > 0.002);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [targetId]);

  return (
    <div ref={ref} className={styles.progress} aria-hidden="true">
      <span className={styles.progressTrack} />
      <span className={styles.progressFill} />
      <span className={styles.progressCup} />
      <span className={styles.progressBall} />
    </div>
  );
}
