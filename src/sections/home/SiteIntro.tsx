"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { preload } from "react-dom";
import { IntroAudio } from "./introSound";
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
const SEQUENCE_MS = 6600;
/** With reduced motion only the logo shows, briefly. */
const REDUCED_MS = 1300;
/** After the sequence, wait at most this long for the 3D course, then open anyway. */
const GRACE_MS = 1500;

/** Sparkle positions for the diamond act (x %, y %, size px, delay s). */
const SPARKLES: Array<[number, number, number, number]> = [
  [12, 22, 14, 0.5], [28, 70, 10, 0.9], [44, 14, 18, 1.3], [58, 82, 12, 0.7], [71, 18, 16, 1.6], [86, 40, 12, 1.1],
  [92, 76, 18, 0.4], [6, 52, 12, 1.9], [36, 40, 9, 2.2], [64, 58, 10, 2.0], [80, 88, 9, 1.4], [20, 88, 14, 2.4],
];

const letters = (word: string, from: number) =>
  [...word].map((ch, i) => (
    <span key={i} className={s.letter} style={{ "--k": from + i } as React.CSSProperties}>
      {ch}
    </span>
  ));

/**
 * Opening of the homepage. Three acts, cut together with the slash from the
 * SL logo sweeping across the screen:
 *   1. the SL logo on black, with a light sweep and the tagline,
 *   2. the founder, in gold,
 *   3. the website's designer, in diamond (the longest act),
 * then it opens up straight into the 3D course — on its own, no tap needed.
 *
 * Plays every time the homepage is opened (also coming back from another
 * page). Tap to skip. Sound starts by itself where the browser allows it,
 * otherwise on the first tap or key press (browsers block sound until then).
 * Server-rendered and animated with transform and opacity only, so it stays
 * smooth while the 3D course is being built underneath.
 */
export function SiteIntro({ tagline, people }: { tagline: string[]; people: IntroPerson[] }) {
  const path = usePathname();
  const home = path === "/";
  const [run, setRun] = useState(0);
  const [gone, setGone] = useState(!home);
  const [leaving, setLeaving] = useState(false);
  const audio = useRef<IntroAudio | null>(null);
  const started = useRef(0);

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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const min = reduced ? REDUCED_MS : SEQUENCE_MS;
    started.current = performance.now();
    // Decode the portraits now, so they are ready the moment their act begins.
    document.querySelectorAll<HTMLImageElement>("[data-intro-img]").forEach((img) => void img.decode?.().catch(() => undefined));

    // Sound: right away if the browser allows it, otherwise on the first tap or key press.
    let a: IntroAudio | null = null;
    const elapsed = () => (performance.now() - started.current) / 1000;
    const begin = () => {
      if (!a || a.ctx.state === "closed") return;
      a.ctx
        .resume()
        .then(() => {
          if (a && a.running && elapsed() < min / 1000) a.schedule(elapsed());
        })
        .catch(() => undefined); // closed meanwhile (skipped)
    };
    const onGesture = () => {
      begin();
      removeGesture();
    };
    const removeGesture = () => {
      for (const ev of ["pointerdown", "keydown", "touchend"]) window.removeEventListener(ev, onGesture, true);
    };
    if (!reduced) {
      try {
        a = new IntroAudio();
        audio.current = a;
        if (a.running) a.schedule(0);
        else {
          begin(); // some browsers allow it after resume()
          for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, onGesture, true);
        }
      } catch {
        a = null;
      }
    }

    // The homepage's animated hero (3D) marks itself data-journey-root and sets data-ready.
    const ready = () => {
      const root = document.querySelector("[data-journey-root]");
      return !root || root.hasAttribute("data-ready");
    };
    const timer = window.setInterval(() => {
      const t = performance.now() - started.current;
      if ((t >= min && ready()) || t >= min + GRACE_MS) {
        window.clearInterval(timer);
        setLeaving(true);
      }
    }, 100);
    return () => {
      window.clearInterval(timer);
      removeGesture();
    };
  }, [home, gone, run]);

  // Let the sound fade with the picture, and tell the 3D course it may use the graphics card fully.
  useEffect(() => {
    if (!leaving) return;
    document.documentElement.dataset.siteIntro = "done";
    window.dispatchEvent(new Event("sl-intro-done"));
    audio.current?.fadeOut(1.4);
    audio.current = null;
  }, [leaving]);

  // The portraits load first, at top priority (the designer's before anything else).
  if (home) for (const p of [...people].reverse()) if (p.photo) preload(p.photo, { as: "image", fetchPriority: "high" });

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
          if (e.target === e.currentTarget && /leave|late/.test(e.animationName)) setGone(true);
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
          const [first, ...restWords] = p.name.split(" ");
          const rest = restWords.join(" ");
          const diamond = p.finish === "diamond";
          const roles = p.role.split(/\s*&\s*/);
          return (
            <section key={p.name} className={`${s.act} ${s.person}`} data-finish={p.finish} data-act={i + 2}>
              <div className={s.personGlow} />
              {diamond && <div className={s.rays} />}
              <span className={s.ghost} aria-hidden="true">
                {p.name}
              </span>
              {diamond &&
                SPARKLES.map(([x, y, size, d], k) => (
                  <i key={k} className={s.sparkle} style={{ left: `${x}%`, top: `${y}%`, "--size": `${size}px`, "--d": `${d}s` } as React.CSSProperties} />
                ))}
              {p.photo && (
                <div className={s.portrait} style={{ "--photo": `url(${p.photo})` } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" fetchPriority="high" loading="eager" decoding="sync" data-intro-img="" />
                  {diamond && <span className={s.portraitSheen} />}
                  <span className={s.flash} />
                </div>
              )}
              <div className={s.card}>
                <span className={s.kicker}>
                  <i />
                  {diamond && <b className={s.gem}>◆</b>}
                  {i === 0 ? "Founded by" : "Designed & built by"}
                </span>
                <h2 className={s.name} data-shine={diamond || undefined}>
                  <span className={s.line}>{diamond ? letters(first, 0) : first}</span>
                  <span className={s.line}>{diamond ? letters(rest, first.length) : rest}</span>
                </h2>
                {diamond ? (
                  <span className={s.chips}>
                    {roles.map((r, k) => (
                      <span key={r} className={s.chip} style={{ "--c": k } as React.CSSProperties}>
                        {r}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className={s.role}>{p.role}</span>
                )}
                {p.handle && <span className={s.handle}>{p.handle}</span>}
                {diamond && <span className={s.enter}>Entering SL Mini Golf Association</span>}
              </div>
              {diamond && <span className={s.flare} />}
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
