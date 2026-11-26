"use client";

import { useEffect, useRef, useState } from "react";
import { IntroAudio } from "@/sections/home/introSound";
import { isSoundOn, setSoundOn } from "@/components/sound/soundPref";
import { ADMIN_CUES } from "./introSound";
import s from "./intro.module.css";

export interface IntroPerson {
  name: string;
  role: string;
  /** Cut-out photo (transparent background), or a portrait. */
  photo?: string;
  /** Finish, as on the website: gold (the founder) or diamond (the designer). */
  finish: "gold" | "diamond";
}

/** In the installed app, coming back after this long counts as opening it again. */
const REOPEN_AFTER_MS = 60_000;

/**
 * Opening animation for the admin (website and the SL Admin app, which opens
 * the same page). The website's opening plays its acts one after another;
 * this one is quicker and splits the screen instead:
 *   1. the SL logo slams in with a gold light and "Admin Panel",
 *   2. a gold slash (the one from the logo) cuts the screen in two and the
 *      founder (gold) and the designer (diamond) rise in side by side,
 *   3. "Access granted", then the two halves slide apart onto the admin.
 *
 * Rendered on the server and animated in CSS (transform, opacity, clip and
 * filter only), so it is on screen from the very first frame. On the website
 * it plays when /admin itself is loaded or refreshed (and on the sign-in page
 * that /admin leads to when signed out), never when moving between pages. The
 * app always starts at /admin, so it plays every time the app opens; it also
 * plays when the app is reopened after a minute in the background. Tap
 * anywhere to skip.
 *
 * With sound (synthesised, see ./introSound.ts) whenever the browser allows
 * it. Browsers block sound until the page has been tapped, so when it is
 * blocked a small "Tap for sound" button shows: it turns the sound on
 * without skipping. The choice is shared with the homepage's sound button.
 */
export function AdminIntro({ people }: { people: IntroPerson[] }) {
  const [gone, setGone] = useState(false);
  const [skip, setSkip] = useState(false);
  const [run, setRun] = useState(0);
  // "playing", "blocked" (browser waits for a tap) or "off" (turned off).
  const [sound, setSound] = useState<"playing" | "blocked" | "off">("off");
  const audio = useRef<IntroAudio | null>(null);
  const started = useRef(0);

  useEffect(() => {
    if (document.documentElement.dataset.adminIntro === "skip") setGone(true);
    const app = window.matchMedia("(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)");
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (app.matches && hiddenAt && Date.now() - hiddenAt > REOPEN_AFTER_MS) {
        delete document.documentElement.dataset.adminIntro;
        setSkip(false);
        setGone(false);
        setRun((n) => n + 1); // remount: CSS animations start again
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Sound: starts with the animation where the browser allows it.
  useEffect(() => {
    if (gone || skip) return;
    if (document.documentElement.dataset.adminIntro === "skip") return;
    started.current = performance.now();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!isSoundOn()) {
      setSound("off");
      return;
    }
    let a: IntroAudio;
    try {
      a = new IntroAudio();
    } catch {
      return;
    }
    audio.current = a;
    setSound("blocked");
    a.ctx
      .resume()
      .then(() => {
        if (audio.current !== a || !a.running) return;
        a.schedule((performance.now() - started.current) / 1000, ADMIN_CUES);
        setSound("playing");
      })
      .catch(() => undefined);
    return () => {
      a.fadeOut(0.35);
      if (audio.current === a) audio.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per run
  }, [run]);

  // Skipped or finished: let the sound fade with the picture.
  useEffect(() => {
    if (!skip && !gone) return;
    audio.current?.fadeOut(skip ? 0.4 : 0.8);
    audio.current = null;
  }, [skip, gone]);

  /** The sound button: on (from the tap, so the browser allows it) or off. */
  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation();
    if (sound === "playing") {
      setSoundOn(false);
      audio.current?.fadeOut(0.3);
      audio.current = null;
      setSound("off");
      return;
    }
    setSoundOn(true);
    try {
      const a = audio.current ?? new IntroAudio();
      audio.current = a;
      void a.ctx.resume().then(() => {
        a.schedule((performance.now() - started.current) / 1000, ADMIN_CUES);
        setSound("playing");
      });
    } catch {}
  }

  if (gone) return null;
  const [left, right] = people;
  return (
    <>
      {/* Runs before the overlay is painted, so other admin pages never flash it. */}
      <script dangerouslySetInnerHTML={{ __html: `if(!/^\\/admin(\\/login)?\\/?$/.test(location.pathname))document.documentElement.dataset.adminIntro="skip"` }} />
      <div
        key={run}
        className={s.intro}
        data-skip={skip || undefined}
        aria-hidden="true"
        onClick={() => setSkip(true)}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && e.animationName.includes("done")) setGone(true);
        }}
      >
        {/* The two halves of the screen, split along the logo's slash. */}
        {[left, right].map((p, i) =>
          p ? (
            <div key={p.name} className={s.half} data-side={i === 0 ? "left" : "right"} data-finish={p.finish}>
              <div className={s.halfGlow} />
              <span className={s.ghost}>{i === 0 ? "Founder" : "Designer"}</span>
              {p.finish === "diamond" && (
                <span className={s.sparkles}>
                  {[0, 1, 2, 3, 4, 5].map((k) => (
                    <i key={k} style={{ "--k": k } as React.CSSProperties} />
                  ))}
                </span>
              )}
              {p.photo && (
                <div className={s.figure}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" fetchPriority="high" loading="eager" decoding="sync" />
                  <span className={s.figureFlash} />
                </div>
              )}
              <div className={s.caption}>
                <span className={s.kicker}>
                  {p.finish === "diamond" && <b>◆</b>}
                  {i === 0 ? "Founded by" : "Designed & built by"}
                </span>
                <span className={s.name}>{p.name}</span>
                <span className={s.role}>{p.role}</span>
              </div>
            </div>
          ) : null,
        )}

        {/* The gold slash, drawn across the screen. */}
        <svg className={s.slash} viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="58" y1="-2" x2="42" y2="102" />
        </svg>

        {/* Stage 1: the brand, which then rises to the top of the screen. */}
        <div className={s.brand}>
          <span className={s.beam} />
          <div className={s.logoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.logo} src="/brand/slmga-logo-dark.svg" alt="" width={520} height={120} fetchPriority="high" />
            <span className={s.shine} />
          </div>
          <p className={s.label}>Admin Panel</p>
        </div>

        <p className={s.stamp}>
          <span>Access granted</span>
        </p>
        <span className={s.grain} />
        <button type="button" className={s.soundBtn} data-state={sound} onClick={toggleSound} aria-label={sound === "playing" ? "Turn the sound off" : "Turn the sound on"}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            {sound === "playing" ? (
              <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="m16.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
          {sound === "playing" ? "Sound on" : "Tap for sound"}
        </button>
        <span className={s.skip}>Tap to skip</span>
      </div>
    </>
  );
}
