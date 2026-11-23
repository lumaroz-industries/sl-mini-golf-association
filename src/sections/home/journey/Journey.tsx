"use client";

import { useEffect, useRef } from "react";
import type { HomeContent } from "@/content/schema";
import { SCENES, SKIP_TO, SKIP_UNTIL, quantizeToStill, sceneOpacity, type SceneId } from "@/experience/timeline/chapters";
import styles from "./Journey.module.css";

interface JourneyProps {
  hero: HomeContent["hero"];
  intro: HomeContent["intro"];
  visionMission: HomeContent["visionMission"];
  community: HomeContent["community"];
}

export function Journey({ hero, intro, visionMission, community }: JourneyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lenisRef = useRef<import("lenis").default | undefined>(undefined);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    // On client-side navigation the pre-paint script in page.tsx has not run.
    if (!document.documentElement.hasAttribute("data-journey")) {
      try {
        if (document.createElement("canvas").getContext("webgl2")) document.documentElement.setAttribute("data-journey", "cinematic");
      } catch {
        /* static layout */
      }
    }
    if (document.documentElement.getAttribute("data-journey") !== "cinematic") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scenes = Array.from(root.querySelectorAll<HTMLElement>("[data-scene]"));
    let engine: import("@/experience/engine/Experience").Experience | undefined;
    let lenis: import("lenis").default | undefined;
    let raf = 0;
    let last = -1;
    let cancelled = false;

    const progress = () => {
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
    };

    const apply = (p: number) => {
      for (const el of scenes) {
        const o = sceneOpacity(SCENES[el.dataset.scene as SceneId], p);
        el.style.opacity = String(o);
        el.style.visibility = o > 0.001 ? "visible" : "hidden";
        el.style.setProperty("--o", String(o));
      }
      root.toggleAttribute("data-past-intro", p > SKIP_UNTIL);
      engine?.setProgress(reduced ? quantizeToStill(p) : p);
    };

    const tick = (time: number) => {
      lenis?.raf(time);
      const p = progress();
      if (p !== last) {
        last = p;
        apply(p);
      }
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      engine?.resize();
      last = -1;
    };

    (async () => {
      try {
        const [{ Experience }, { detectQuality }, LenisModule] = await Promise.all([
          import("@/experience/engine/Experience"),
          import("@/experience/quality"),
          reduced ? Promise.resolve(undefined) : import("lenis"),
        ]);
        if (cancelled) return;
        await document.fonts.ready;
        const font = getComputedStyle(document.documentElement).getPropertyValue("--font-clash").trim() || "sans-serif";
        await document.fonts.load(`600 100px ${font}`).catch(() => undefined);
        if (cancelled) return;
        engine = new Experience({
          canvas,
          quality: detectQuality(),
          text: { title: hero.title, taglineTop: hero.taglineLines[0], taglineBottom: hero.taglineLines[1], font },
        });
        engine.setProgress(reduced ? quantizeToStill(progress()) : progress());
        engine.renderNow();
        root.setAttribute("data-ready", "");
        if (LenisModule) {
          lenis = new LenisModule.default({
            lerp: 0.085,
            smoothWheel: true,
            anchors: true,
            prevent: (node: HTMLElement) => Boolean(node.closest?.("#site-menu")),
          });
          lenisRef.current = lenis;
        }
      } catch (err) {
        // Fall back to the static layout; the content is all still there.
        console.error("3D experience unavailable:", err);
        document.documentElement.removeAttribute("data-journey");
      }
    })();

    // Pause smooth scrolling while the full-screen menu locks the page.
    const lockObserver = new MutationObserver(() => {
      if (document.body.hasAttribute("data-scroll-locked")) lenis?.stop();
      else lenis?.start();
    });
    lockObserver.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });

    apply(progress());
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      lockObserver.disconnect();
      lenis?.destroy();
      lenisRef.current = undefined;
      engine?.dispose();
    };
  }, [hero]);

  /**
   * Skip to the finale (SL logo over the lit course): a quick fade to black,
   * an instant jump, then fade back in — rather than racing through the whole
   * animation.
   */
  const skipIntro = () => {
    const root = rootRef.current;
    if (!root || root.hasAttribute("data-skipping")) return;
    const top = root.getBoundingClientRect().top + window.scrollY;
    const y = top + SKIP_TO * (root.offsetHeight - window.innerHeight);
    const jump = () => {
      if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: "instant" });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return jump();
    root.setAttribute("data-skipping", "");
    window.setTimeout(() => {
      jump();
      // Let the new frame render before fading back in.
      requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-skipping")));
    }, 320);
  };

  return (
    <div ref={rootRef} className={styles.journey}>
      <div className={styles.stage}>
        <div className={styles.backdrop} aria-hidden="true">
          <div className={styles.glow} />
          <div className={styles.floor} />
        </div>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.scenes}>
          <div data-scene="cue" className={`${styles.scene} ${styles.cue}`} aria-hidden="true">
            <span>Scroll to begin</span>
            <i />
          </div>

          <section data-scene="hero" className={`${styles.scene} ${styles.hero}`} aria-labelledby="hero-title">
            <h1 id="hero-title" className={styles.heroTitle}>
              {hero.title}
            </h1>
            <p className={styles.tagline}>
              <span>{hero.taglineLines[0]}</span>
              <span>{hero.taglineLines[1]}</span>
            </p>
            <p className={styles.supporting}>{hero.supporting}</p>
          </section>

          <div data-scene="short" className={`${styles.scene} ${styles.short}`}>
            <span className="kicker">Beyond the game</span>
            <p>{intro.short}</p>
          </div>

          <section data-scene="intro" className={`${styles.scene} ${styles.intro}`} aria-labelledby="intro-title">
            <div className={styles.panel}>
              <span className="kicker">{intro.kicker}</span>
              <h2 id="intro-title" className={styles.introTitle}>
                {intro.heading}
              </h2>
              <p>{intro.body}</p>
            </div>
          </section>

          <h2 className="visually-hidden">{visionMission.kicker}</h2>
          <section data-scene="vision" className={`${styles.scene} ${styles.statement} ${styles.left}`} aria-labelledby="vision-title">
            <span className="kicker">{visionMission.kicker}</span>
            <h3 id="vision-title" className={styles.statementLabel}>
              Vision
            </h3>
            <p>{visionMission.vision}</p>
          </section>
          <section data-scene="mission" className={`${styles.scene} ${styles.statement} ${styles.right}`} aria-labelledby="mission-title">
            <span className="kicker">{visionMission.kicker}</span>
            <h3 id="mission-title" className={styles.statementLabel}>
              Mission
            </h3>
            <p>{visionMission.mission}</p>
          </section>

          <h2 className="visually-hidden">
            {community.kicker}: {community.heading}
          </h2>
          {community.items.slice(0, 4).map((item, i) => (
            <section
              key={item.id}
              data-scene={`community${i}`}
              className={`${styles.scene} ${styles.message} ${i % 2 ? styles.right : styles.left}`}
              aria-labelledby={`community-${item.id}`}
            >
              <span className={styles.messageIndex}>
                <span className="kicker">{community.kicker}</span>
                <b>
                  {String(i + 1).padStart(2, "0")} / {String(Math.min(4, community.items.length)).padStart(2, "0")}
                </b>
              </span>
              <h3 id={`community-${item.id}`} className={styles.messageTitle}>
                {item.title}
              </h3>
              <p>{item.body}</p>
            </section>
          ))}

          <div data-scene="finale" className={`${styles.scene} ${styles.finale}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/slmga-logo-dark.svg" alt="" width={420} height={58} className={styles.finaleLogo} />
            <p>{hero.supporting}</p>
          </div>
        </div>

        <button type="button" className={styles.skip} onClick={skipIntro}>
          Skip intro <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  );
}
