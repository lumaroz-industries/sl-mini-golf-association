"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeContent } from "@/content/schema";
import { P } from "./ballScene";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { isSoundOn, onSoundChange } from "@/components/sound/soundPref";
import s from "./BallHero.module.css";

/**
 * Homepage hero, driven by scroll: a golf ball in free fall tears through the
 * sky — air streaks, clouds and rings of light rushing past, the camera
 * shaking — heats up like a meteor, burns apart into embers, and the embers
 * gather into the SL Mini Golf Association logo with the tagline beneath.
 * Scroll back up and it plays in reverse.
 *
 * It is its own section (not part of the opening intro): it waits for the
 * intro to finish before drawing, so the two never compete. Without WebGL —
 * or with reduced motion — the logo and tagline simply show.
 */
interface Note {
  kicker: string;
  title?: string;
  /** "01 / 04" for the community points. */
  index?: string;
  body: string;
  side: "left" | "right";
  /** Scroll window (progress) in which it shows. */
  from: number;
  to: number;
}

/** The homepage story, spread along the fall (before the ball starts to burn). */
function buildNotes(intro: HomeContent["intro"], vm: HomeContent["visionMission"], community: HomeContent["community"]): Note[] {
  const items = community.items.slice(0, 4);
  const list: Array<Omit<Note, "side" | "from" | "to">> = [
    { kicker: "Beyond the game", body: intro.short },
    { kicker: intro.kicker, title: intro.heading, body: intro.body },
    { kicker: vm.kicker, title: "Vision", body: vm.vision },
    { kicker: vm.kicker, title: "Mission", body: vm.mission },
    ...items.map((it, i) => ({ kicker: community.kicker, index: `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`, title: it.title, body: it.body })),
  ];
  const start = 0.07;
  const end = P.dissolveStart - 0.02;
  const span = (end - start) / list.length;
  return list.map((n, i) => ({ ...n, side: i % 2 ? "right" : "left", from: start + i * span, to: start + (i + 1) * span }));
}

const fade = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function BallHero({
  hero,
  intro,
  visionMission,
  community,
}: {
  hero: HomeContent["hero"];
  intro: HomeContent["intro"];
  visionMission: HomeContent["visionMission"];
  community: HomeContent["community"];
}) {
  const notes = buildNotes(intro, visionMission, community);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"static" | "live">("live");

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const cv = canvas.current;
    if (!el || !st || !cv) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl = false;
    try {
      gl = !!document.createElement("canvas").getContext("webgl2");
    } catch {}
    if (!gl || reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check after mount
      setMode("static");
      el.setAttribute("data-ready", "");
      return;
    }

    let scene: import("./ballScene").BallScene | undefined;
    let audio: import("./fallSound").FallAudio | undefined;
    let onScreen = true;
    let cancelled = false;
    let raf = 0;
    const light = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency ?? 8) <= 4;

    const progress = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
    };

    function place() {
      if (!scene || !st) return;
      const r = scene.logoRect();
      st.style.setProperty("--logo-w", `${r.width}px`);
      st.style.setProperty("--logo-cy", `${r.cy}px`);
    }

    // Page-side effects that follow the scene: vignette strength and the logo/tagline reveal.
    const sync = () => {
      if (scene) {
        scene.setProgress(progress());
        st.style.setProperty("--speed", scene.intensity.toFixed(3));
        st.toggleAttribute("data-formed", scene.progress > P.formEnd - 0.02);
        st.toggleAttribute("data-started", scene.progress > 0.015);
        // The story notes beside the ball fade in and out with the scroll.
        const p = scene.progress;
        noteEls.forEach((n, i) => {
          const { from, to } = notes[i];
          const w = Math.min(0.02, (to - from) / 4);
          const o = fade(from, from + w, p) * (1 - fade(to - w, to, p));
          n.style.setProperty("--o", o.toFixed(3));
          n.style.visibility = o > 0.001 ? "visible" : "hidden";
        });
        audio?.update(scene.audio, onScreen);
      }
      raf = requestAnimationFrame(sync);
    };

    (async () => {
      try {
        const [{ BallScene }, { FallAudio }] = await Promise.all([import("./ballScene"), import("./fallSound")]);
        if (cancelled) return;
        scene = new BallScene({ canvas: cv, light, onEvent: (e) => audio?.event(e) });
        if (location.search.includes("debug-ball")) (window as unknown as { __slBall: unknown }).__slBall = scene;
        await scene.prepare();
        if (cancelled) return;
        place();
        el.setAttribute("data-ready", "");
        const go = () => {
          if (cancelled || !scene) return;
          scene.start();
          raf = requestAnimationFrame(sync);
          // Sound: plays by itself if the browser allows; otherwise from the first tap, click or key.
          try {
            audio = new FallAudio();
            audio.enabled = isSoundOn();
            void audio.unlock().then((on) => {
              if (on || cancelled) return;
              const unlock = () => {
                void audio?.unlock();
                for (const ev of ["pointerdown", "keydown", "touchend"]) window.removeEventListener(ev, unlock, true);
              };
              for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, unlock, true);
              removeUnlock = () => {
                for (const ev of ["pointerdown", "keydown", "touchend"]) window.removeEventListener(ev, unlock, true);
              };
            });
          } catch {
            audio = undefined;
          }
        };
        // Let the opening intro have the graphics card to itself first.
        if (document.documentElement.dataset.siteIntro === "play") window.addEventListener("sl-intro-done", go, { once: true });
        else go();
      } catch (err) {
        console.error("Hero animation unavailable:", err);
        setMode("static");
        el.setAttribute("data-ready", "");
      }
    })();

    const onResize = () => {
      scene?.resize();
      place();
    };
    window.addEventListener("resize", onResize);
    const noteEls = Array.from(st.querySelectorAll<HTMLElement>("[data-note]"));
    let removeUnlock = () => {};
    // The Sound on/off choice (from either button on the page), remembered for next time.
    const offSound = onSoundChange((on) => {
      if (!audio) return;
      audio.enabled = on;
      if (on) void audio.unlock(); // the button click lets the browser start it
    });
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      scene?.setVisible(e.isIntersecting);
    });
    io.observe(el);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      removeUnlock();
      offSound();
      audio?.dispose();
      scene?.dispose();
    };
  }, []);

  return (
    <section ref={root} className={s.hero} data-journey-root="" data-mode={mode} aria-labelledby="hero-title">
      <div ref={stage} className={s.stage}>
        <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
        <div className={s.vignette} aria-hidden="true" />
        {/* The crisp logo: fades in over the particle logo once it has formed (or shows at once without animation). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.logo} src="/brand/slmga-logo-dark.svg" alt="" width={1806} height={250} aria-hidden="true" />
        <div className={s.copy}>
          <h1 id="hero-title" className="visually-hidden">
            {hero.title}
          </h1>
          <p className={s.tagline}>
            <span>{hero.taglineLines[0]}</span> <span>{hero.taglineLines[1]}</span>
          </p>
          <p className={s.supporting}>{hero.supporting}</p>
        </div>
        {/* The story, beside the falling ball (plain stacked text without the animation). */}
        <div className={s.notes}>
          {notes.map((n, i) => (
            <article key={i} data-note="" data-side={n.side} className={s.note}>
              <span className={s.pointer} aria-hidden="true" />
              <span className={s.kicker}>
                {n.kicker}
                {n.index && <b>{n.index}</b>}
              </span>
              {n.title && <h2 className={s.noteTitle}>{n.title}</h2>}
              <p className={s.noteBody}>{n.body}</p>
            </article>
          ))}
        </div>

        <div className={s.controls}>
          <SoundToggle />
          <button
            type="button"
            className={`diamond-btn ${s.skip}`}
            onClick={() => {
              // Jump straight to the formed logo at the end of the fall.
              const el = root.current;
              if (!el) return;
              const top = el.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: top + el.offsetHeight - window.innerHeight, behavior: "instant" });
            }}
          >
            Skip
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <span className={s.cue} aria-hidden="true">
          Scroll to fall
          <i />
        </span>
      </div>
    </section>
  );
}
