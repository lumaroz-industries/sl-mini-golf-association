"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import s from "./SiteIntro.module.css";

export interface IntroPerson {
  name: string;
  role: string;
  /** Cut-out portrait (transparent background). */
  photo?: string;
  handle?: string;
  /** Finish, matching their Social Media card. */
  finish: "gold" | "diamond";
}

/** Full sequence: logo → founder → designer (see the CSS timeline). */
const SEQUENCE_MS = 5650;
/** With reduced motion only the logo shows, briefly. */
const REDUCED_MS = 1300;
/** Longest wait for the 3D course; after this the intro leaves anyway. */
const MAX_MS = 12000;

/**
 * Opening of the homepage. Three acts, cut together with the slash from the
 * SL logo sweeping across the screen:
 *   1. the SL logo with a light sweep and the tagline,
 *   2. the founder, in gold,
 *   3. the website's designer, in diamond,
 * then it opens up straight into the 3D course.
 *
 * Plays every time the homepage is opened (also coming back from another
 * page) and stays until the 3D course is ready, so there is never a black
 * screen in between. Tap to skip. Server-rendered, pure CSS animation, so it
 * is on screen from the very first frame.
 */
export function SiteIntro({ tagline, people }: { tagline: string[]; people: IntroPerson[] }) {
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
    const min = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? REDUCED_MS : SEQUENCE_MS;
    const start = performance.now();
    const cinematic = () => document.documentElement.dataset.journey === "cinematic";
    const ready = () => !!document.querySelector("[data-journey-root][data-ready]") || !cinematic();
    const timer = window.setInterval(() => {
      const t = performance.now() - start;
      if ((t >= min && ready()) || t >= MAX_MS) {
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
        {/* Act 1 — the brand */}
        <section className={`${s.act} ${s.brandAct}`}>
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
        </section>

        {/* Acts 2 and 3 — the people behind it */}
        {people.slice(0, 2).map((p, i) => {
          const [first, ...rest] = p.name.split(" ");
          return (
            <section key={p.name} className={`${s.act} ${s.person}`} data-finish={p.finish} data-act={i + 2}>
              <div className={s.personGlow} />
              <span className={s.ghost} aria-hidden="true">
                {p.name}
              </span>
              {p.photo && (
                <div className={s.portrait}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" fetchPriority="high" />
                </div>
              )}
              <div className={s.card}>
                <span className={s.kicker}>
                  <i />
                  {i === 0 ? "Founded by" : "Designed & built by"}
                </span>
                <h2 className={s.name}>
                  <span>{first}</span>
                  <span>{rest.join(" ")}</span>
                </h2>
                <span className={s.role}>{p.role}</span>
                {p.handle && <span className={s.handle}>{p.handle}</span>}
              </div>
            </section>
          );
        })}

        {/* The slash from the SL logo, sweeping across between acts. */}
        <span className={s.slash} data-n="1" />
        <span className={s.slash} data-n="2" />
        <span className={s.grain} />
        <span className={s.skip}>Tap to skip</span>
      </div>
    </>
  );
}
