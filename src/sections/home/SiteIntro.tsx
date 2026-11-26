"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { preload } from "react-dom";
import { IntroAudio } from "./introSound";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { isSoundOn } from "@/components/sound/soundPref";
import s from "./SiteIntro.module.css";

export interface IntroPerson {
  name: string;
  role: string;
  /** Cut-out portrait (transparent background). */
  photo?: string;
  handle?: string;
  /** Finish, matching their Social Media card. */
  finish: "gold" | "diamond";
  /** Word drifting large behind them (defaults to their full name). */
  ghost?: string;
}

/** Full sequence: logo → founder → designer (see the CSS timeline). */
const SEQUENCE_MS = 5600;
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
 *   2. the founder (gold) and the designer (diamond) side by side, the
 *      screen split down the middle by the logo's slash,
 *   3. the website's designer alone, full screen, in diamond,
 * then it opens up straight into the 3D course — on its own, no tap needed.
 *
 * Plays every time the homepage is opened (also coming back from another
 * page). Tap to skip. Sound is always on. Browsers mute a page until the
 * visitor has tapped or clicked on it, so a fresh visit first shows an
 * "Enter" screen (SL logo + gold Enter): that tap starts the intro with full
 * sound (and unlocks the falling-ball sound later). If the visitor has
 * already interacted with the site (e.g. coming back to the homepage), the
 * Enter screen is skipped and the intro plays with sound straight away.
 * Server-rendered and animated with transform and opacity only, so it stays
 * smooth while the 3D course is being built underneath.
 */
export function SiteIntro({ tagline, people }: { tagline: string[]; people: IntroPerson[] }) {
  const path = usePathname();
  const home = path === "/";
  const [run, setRun] = useState(0);
  const [gone, setGone] = useState(!home);
  const [leaving, setLeaving] = useState(false);
  // False while the Enter screen shows; the acts (and their animations) only start once entered.
  const [entered, setEntered] = useState(false);
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
      setEntered(false);
    } else setGone(true);
  }

  // Already interacted with the site (sound allowed), or reduced motion: no Enter screen.
  useLayoutEffect(() => {
    if (!home || gone || entered) return;
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decided before first paint
    // Sound turned off by the visitor: no tap needed, so no Enter screen either.
    if (active || !isSoundOn() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEntered(true);
  }, [home, gone, entered, run]);

  /** The visitor's tap on the Enter screen: start the sound inside the tap (so the browser allows it), then the intro. */
  function enter() {
    if (isSoundOn())
      try {
        const a = new IntroAudio();
        void a.ctx.resume();
        audio.current = a;
      } catch {}
    setEntered(true);
  }

  /** Sound on/off from the button (inside the click, so the browser allows it). */
  function toggleSound(on: boolean) {
    if (!on) {
      audio.current?.fadeOut(0.25);
      audio.current = null;
      return;
    }
    if (!entered) return; // the Enter tap will start it
    try {
      const a = new IntroAudio();
      audio.current = a;
      const at = (performance.now() - started.current) / 1000;
      void a.ctx.resume().then(() => a.schedule(at));
    } catch {}
  }

  useEffect(() => {
    if (!home || gone) return;
    document.documentElement.dataset.siteIntro = "play";
    if (!entered) return;
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
          if (!a || !a.running) return;
          if (elapsed() < min / 1000) a.schedule(elapsed());
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
    if (!reduced && isSoundOn()) {
      try {
        a = audio.current ?? new IntroAudio();
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
  }, [home, gone, run, entered]);

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
        data-entered={entered || undefined}
        onClick={() => (entered ? setLeaving(true) : enter())}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && /leave|late/.test(e.animationName)) setGone(true);
        }}
      >
        <SoundToggle className={s.soundBtn} onToggle={toggleSound} />

        {/* Enter screen: the visitor's one tap lets the browser play the sound. */}
        <div className={s.gate} aria-hidden={entered || undefined}>
          <div className={s.gateGlow} />
          <div className={s.gateLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-logo-dark.svg" alt="SL Mini Golf Association" width={520} height={120} />
            <span className={s.gateShine} />
          </div>
          <button type="button" className={s.enterBtn} autoFocus={!entered} tabIndex={entered ? -1 : 0} onClick={(e) => (e.stopPropagation(), enter())}>
            <span>Enter</span>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className={s.gateNote}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Sound on for the full experience
          </p>
        </div>

        {entered && (
          <div className={s.acts}>
            {/* Act 1 — the brand */}
            <section className={`${s.act} ${s.brandAct}`} aria-hidden="true">
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

            {/* Act 2 — the two of them, side by side on a screen split by the logo's slash */}
            <section className={`${s.act} ${s.duo}`} aria-hidden="true">
              {people.slice(0, 2).map((p, i) => (
                <div key={p.name} className={s.half} data-side={i === 0 ? "left" : "right"} data-finish={p.finish}>
                  <div className={s.halfGlow} />
                  <span className={s.halfWord}>{i === 0 ? "Founder" : "Designer"}</span>
                  {p.photo && (
                    <div className={s.halfFigure}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photo} alt="" fetchPriority="high" loading="eager" decoding="sync" data-intro-img="" />
                    </div>
                  )}
                  <div className={s.halfCaption}>
                    <span className={s.halfKicker}>
                      {p.finish === "diamond" && <b>◆</b>}
                      {i === 0 ? "Founded by" : "Designed & built by"}
                    </span>
                    <span className={s.halfName}>{p.name}</span>
                  </div>
                </div>
              ))}
              <svg className={s.duoLine} viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="58" y1="-2" x2="42" y2="102" />
              </svg>
            </section>

            {/* Act 3 — the designer, full screen */}
            {people.slice(0, 2).map((p, i) => {
              if (i === 0) return null;
              const [first, ...restWords] = p.name.split(" ");
              const rest = restWords.join(" ");
              const diamond = p.finish === "diamond";
              const roles = p.role.split(/\s*&\s*/);
              return (
                <section key={p.name} aria-hidden="true" className={`${s.act} ${s.person}`} data-finish={p.finish} data-act={i + 2}>
                  <div className={s.personGlow} />
                  {diamond && <div className={s.rays} />}
                  <span className={s.ghost} aria-hidden="true">
                    {p.ghost ?? p.name}
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
            <span className={s.slash} data-n="1" aria-hidden="true" />
            <span className={s.slash} data-n="2" aria-hidden="true" />
            <span className={s.grain} />
            <button
              type="button"
              className={`diamond-btn ${s.skipBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                setLeaving(true);
              }}
            >
              Skip intro
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <path d="M5 5l7 7-7 7M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
