"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeContent } from "@/content/schema";
import { T } from "./ballScene";
import s from "./BallHero.module.css";

/**
 * Homepage hero: a golf ball falls through the dark, dissolves into glowing
 * particles and they gather into the SL Mini Golf Association logo; the
 * tagline then appears beneath it. Plays once the opening intro has faded
 * (or straight away when there is no intro). Without WebGL — or with reduced
 * motion — the logo and tagline simply show.
 */
export function BallHero({ hero }: { hero: HomeContent["hero"] }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"static" | "loading" | "playing" | "formed">("loading");

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl = false;
    try {
      gl = !!document.createElement("canvas").getContext("webgl2");
    } catch {}
    if (!gl || reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check after mount
      setPhase("static");
      el.setAttribute("data-ready", "");
      return;
    }

    let scene: import("./ballScene").BallScene | undefined;
    let cancelled = false;
    let formedTimer = 0;
    const light = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency ?? 8) <= 4;

    const begin = () => {
      if (cancelled || !scene) return;
      setPhase("playing");
      scene.play(0);
      formedTimer = window.setTimeout(() => setPhase("formed"), T.formEnd * 1000);
    };

    (async () => {
      try {
        const { BallScene } = await import("./ballScene");
        if (cancelled) return;
        scene = new BallScene({ canvas: cv, light });
        // Testing aid: ?debug-ball exposes the scene to freeze it at a moment.
        if (location.search.includes("debug-ball")) (window as unknown as { __slBall: unknown }).__slBall = scene;
        await scene.prepare();
        if (cancelled) return;
        place();
        el.setAttribute("data-ready", "");
        // Wait for the opening intro to fade, if it is playing.
        if (document.documentElement.dataset.siteIntro === "play") window.addEventListener("sl-intro-done", () => window.setTimeout(begin, 250), { once: true });
        else begin();
      } catch (err) {
        console.error("Hero animation unavailable:", err);
        setPhase("static");
        el.setAttribute("data-ready", "");
      }
    })();

    // Lay the crisp logo (and the tagline under it) exactly where the particles form it.
    function place() {
      if (!scene || !el) return;
      const r = scene.logoRect();
      el.style.setProperty("--logo-w", `${r.width}px`);
      el.style.setProperty("--logo-cy", `${r.cy}px`);
    }
    const onResize = () => {
      scene?.resize();
      place();
    };
    window.addEventListener("resize", onResize);
    // Pause drawing while the hero is scrolled out of view.
    const io = new IntersectionObserver(([e]) => scene?.setVisible(e.isIntersecting));
    io.observe(el);
    return () => {
      cancelled = true;
      clearTimeout(formedTimer);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      scene?.dispose();
    };
  }, []);

  return (
    <section ref={root} className={s.hero} data-journey-root="" data-phase={phase} aria-labelledby="hero-title">
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
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
        Scroll
        <i />
      </span>
    </section>
  );
}
