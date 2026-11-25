"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import s from "./SiteIntro.module.css";

/** Shortest time the intro stays up, so it always plays in full. */
const MIN_MS = 1900;
/** Longest wait for the 3D course; after this the intro leaves anyway. */
const MAX_MS = 9000;

/**
 * Opening animation for the homepage — the website's version of the admin
 * intro, in emerald: the SL logo with a light sweep and the tagline, then it
 * opens up straight into the 3D course.
 *
 * It plays every time the homepage is opened (also when coming back to it
 * from another page), and it stays up until the 3D course has finished
 * loading — so visitors never see a black screen in between. Tap to skip.
 * Server-rendered and pure CSS, so it is on screen from the first frame.
 */
export function SiteIntro({ tagline }: { tagline: string[] }) {
  const path = usePathname();
  const home = path === "/";
  const [run, setRun] = useState(0);
  const [gone, setGone] = useState(!home);
  const [leaving, setLeaving] = useState(false);

  // Coming back to the homepage from another page plays it again.
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    if (home) {
      setRun((n) => n + 1);
      setGone(false);
      setLeaving(false);
    } else setGone(true);
  }

  useEffect(() => {
    if (!home || gone) return;
    document.documentElement.dataset.siteIntro = "play";
    const start = performance.now();
    const cinematic = () => document.documentElement.dataset.journey === "cinematic";
    const ready = () => !!document.querySelector("[data-journey-root][data-ready]") || !cinematic();
    const timer = window.setInterval(() => {
      const t = performance.now() - start;
      if ((t >= MIN_MS && ready()) || t >= MAX_MS) {
        window.clearInterval(timer);
        setLeaving(true);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [home, gone, run]);

  if (gone) return null;
  return (
    <>
      {/* Hides the overlay before first paint on every page except the homepage. */}
      <script dangerouslySetInnerHTML={{ __html: `if(location.pathname!=="/")document.documentElement.dataset.siteIntro="skip"` }} />
      <div
        key={run}
        className={s.intro}
        data-leave={leaving || undefined}
        aria-hidden="true"
        onClick={() => setLeaving(true)}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && e.animationName.includes("out")) setGone(true);
        }}
      >
        <div className={s.glow} />
        <div className={s.brand}>
          <div className={s.logoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.logo} src="/brand/slmga-logo-dark.svg" alt="" width={520} height={120} fetchPriority="high" />
            <span className={s.shine} />
          </div>
          <span className={s.rule} />
          <p className={s.tagline}>
            {tagline.map((t, i) => (
              <span key={t} style={{ "--i": i } as React.CSSProperties}>
                {t}
              </span>
            ))}
          </p>
        </div>
        <span className={s.skip}>Tap to skip</span>
      </div>
    </>
  );
}
