"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
const SEQUENCE_MS = 6300;
/** With reduced motion only the logo shows, briefly. */
const REDUCED_MS = 1300;
/** After the sequence, wait at most this long for the 3D course, then open anyway. */
const GRACE_MS = 1500;
const SOUND_KEY = "sl-intro-sound";

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
 * page). Tap to skip. Optional sound (the browser only allows it after a
 * tap, so there is a Sound button). Server-rendered, pure CSS animation, so
 * it is on screen from the very first frame.
 */
export function SiteIntro({ tagline, people }: { tagline: string[]; people: IntroPerson[] }) {
  const path = usePathname();
  const home = path === "/";
  const [run, setRun] = useState(0);
  const [gone, setGone] = useState(!home);
  const [leaving, setLeaving] = useState(false);
  const [sound, setSound] = useState(false);
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

    // Sound, if the visitor turned it on before and the browser allows it.
    let wanted = false;
    try {
      wanted = localStorage.getItem(SOUND_KEY) === "on";
    } catch {}
    if (wanted && !reduced) {
      try {
        const a = new IntroAudio();
        if (a.running) {
          audio.current = a;
          a.schedule(0);
          setSound(true);
        } else void a.ctx.close();
      } catch {}
    }

    const cinematic = () => document.documentElement.dataset.journey === "cinematic";
    const ready = () => !!document.querySelector("[data-journey-root][data-ready]") || !cinematic();
    const timer = window.setInterval(() => {
      const t = performance.now() - started.current;
      if ((t >= min && ready()) || t >= min + GRACE_MS) {
        window.clearInterval(timer);
        setLeaving(true);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [home, gone, run]);

  // Let the sound fade with the picture.
  useEffect(() => {
    if (!leaving) return;
    audio.current?.fadeOut(0.7);
    audio.current = null;
  }, [leaving]);

  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation(); // not a "skip"
    if (sound) {
      audio.current?.fadeOut(0.2);
      audio.current = null;
      setSound(false);
      try {
        localStorage.setItem(SOUND_KEY, "off");
      } catch {}
      return;
    }
    try {
      const a = new IntroAudio();
      void a.ctx.resume().then(() => a.schedule((performance.now() - started.current) / 1000));
      audio.current = a;
      setSound(true);
      localStorage.setItem(SOUND_KEY, "on");
    } catch {}
  }

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
                  <img src={p.photo} alt="" fetchPriority="high" />
                  <span className={s.portraitSheen} />
                </div>
              )}
              <div className={s.card}>
                <span className={s.kicker}>
                  <i />
                  {diamond && <b className={s.gem}>◆</b>}
                  {i === 0 ? "Founded by" : "Designed & built by"}
                </span>
                <h2 className={s.name}>
                  <span className={s.line}>{letters(first, 0)}</span>
                  <span className={s.line}>{letters(rest, first.length)}</span>
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
        <button type="button" className={s.sound} data-on={sound || undefined} onClick={toggleSound} aria-label={sound ? "Sound off" : "Sound on"}>
          <span className={s.bars} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          {sound ? "Sound on" : "Sound"}
        </button>
        <span className={s.skip}>Tap to skip</span>
      </div>
    </>
  );
}
