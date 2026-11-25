"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeContent } from "@/content/schema";
import { P } from "./ballScene";
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
export function BallHero({ hero }: { hero: HomeContent["hero"] }) {
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
    let removeUnlock = () => {};
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
        <span className={s.cue} aria-hidden="true">
          Scroll to fall
          <i />
        </span>
      </div>
    </section>
  );
}
