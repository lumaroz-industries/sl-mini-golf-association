"use client";

import { useEffect, useRef } from "react";
import type { HomeContent } from "@/content/schema";
import { SCENES, SKIP_TO, SKIP_UNTIL, quantizeToStill, sceneOpacity, type SceneId } from "@/experience/timeline/chapters";
import { detectQuality, lowerQuality } from "@/experience/quality";
import { prefetchSurfaces } from "@/experience/materials/surfaceCache";
import styles from "./Journey.module.css";

/**
 * Start fetching the 3D engine and preparing the course textures as soon as
 * this script runs — before the page has finished hydrating.
 */
const early =
  typeof window !== "undefined"
    ? (() => {
        // Only on a page that uses the 3D course (its pre-paint script set this).
        if (document.documentElement.dataset.journey !== "cinematic") return undefined;
        try {
          if (!document.createElement("canvas").getContext("webgl2")) return undefined;
        } catch {
          return undefined;
        }
        const quality = detectQuality();
        return {
          quality,
          engine: import("@/experience/engine/Experience"),
          surfaces: prefetchSurfaces(quality.textureSize),
        };
      })()
    : undefined;

/** The SL Mini Golf Association logo (public/brand/slmga-logo-dark.svg), inlined. */
const FINALE_LOGO = `<path fill="#FFFFFF" transform="matrix(1 0 -0.43 1 107.88 0)" d="M337 0L322 52H99A23 23 0 0 0 76 75V75A23 23 0 0 0 99 98H267A62 62 0 0 1 329 160V186A62 62 0 0 1 267 248H0L15 196H238A23 23 0 0 0 261 173V173A23 23 0 0 0 238 150H70A62 62 0 0 1 8 88V62A62 62 0 0 1 70 0ZM359 0H427V173A23 23 0 0 0 450 196H605V248H359Z"/>
<path fill="#00A86B" d="M740 2H751L665 248H654Z"/>
<path fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 -0.26 1 29.64 0)" d="M780 114L780 14L812 14L858.5 66L905 14L937 14L937 114L910 114L910 52L867 98L850 98L807 52L807 114ZM959 14H986V114H959ZM1009 114L1009 14L1039 14L1104 81L1104 14L1131 14L1131 114L1100 114L1036 47L1036 114ZM1153 14H1180V114H1153ZM1370 14L1363 37H1282A12 12 0 0 0 1270 49V80A12 12 0 0 0 1282 92H1333A12 12 0 0 0 1345 80V75H1295V55H1372V86A28 28 0 0 1 1344 114H1271A28 28 0 0 1 1243 86V42A28 28 0 0 1 1271 14ZM1414 14H1492A26 26 0 0 1 1518 40V88A26 26 0 0 1 1492 114H1414A26 26 0 0 1 1388 88V40A26 26 0 0 1 1414 14ZM1425 37H1482A10 10 0 0 1 1492 47V82A10 10 0 0 1 1482 92H1425A10 10 0 0 1 1415 82V47A10 10 0 0 1 1425 37ZM1537 14H1564V85A6 6 0 0 0 1570 91H1645V114H1537ZM1663 114V14H1778L1773 37H1690V114ZM1696 55H1748V75H1696Z"/>
<path fill="#FFFFFF" fill-rule="evenodd" transform="matrix(1 0 -0.14 1 29.26 0)" d="M787 154L797 154L827 212L816 212L808.24 197L775.5 197L768 212L758 212ZM780 188L803.59 188L791.59 164.81ZM925.9 153L921.9 163H889.9A7.5 7.5 0 0 0 882.4 170.5V170.5A7.5 7.5 0 0 0 889.9 178H909.9A14 14 0 0 1 923.9 192V199A14 14 0 0 1 909.9 213H869.9L873.9 203H905.9A7.5 7.5 0 0 0 913.4 195.5V195.5A7.5 7.5 0 0 0 905.9 188H885.9A14 14 0 0 1 871.9 174V167A14 14 0 0 1 885.9 153ZM1024.8 153L1020.8 163H988.8A7.5 7.5 0 0 0 981.3 170.5V170.5A7.5 7.5 0 0 0 988.8 178H1008.8A14 14 0 0 1 1022.8 192V199A14 14 0 0 1 1008.8 213H968.8L972.8 203H1004.8A7.5 7.5 0 0 0 1012.3 195.5V195.5A7.5 7.5 0 0 0 1004.8 188H984.8A14 14 0 0 1 970.8 174V167A14 14 0 0 1 984.8 153ZM1085.7 153H1120.7A18 18 0 0 1 1138.7 171V195A18 18 0 0 1 1120.7 213H1085.7A18 18 0 0 1 1067.7 195V171A18 18 0 0 1 1085.7 153ZM1086.7 163H1119.7A8.5 8.5 0 0 1 1128.2 171.5V194.5A8.5 8.5 0 0 1 1119.7 203H1086.7A8.5 8.5 0 0 1 1078.2 194.5V171.5A8.5 8.5 0 0 1 1086.7 163ZM1244.6 153V163H1200.6A8.5 8.5 0 0 0 1192.1 171.5V194.5A8.5 8.5 0 0 0 1200.6 203H1244.6V213H1199.6A18 18 0 0 1 1181.6 195V171A18 18 0 0 1 1199.6 153ZM1287.5 154H1298V212H1287.5ZM1369.9 154L1379.9 154L1409.9 212L1398.9 212L1391.14 197L1358.4 197L1350.9 212L1340.9 212ZM1362.9 188L1386.49 188L1374.49 164.81ZM1438.8 154L1498.8 154L1498.8 163.5L1474.05 163.5L1474.05 212L1463.55 212L1463.55 163.5L1438.8 163.5ZM1541.7 154H1552.2V212H1541.7ZM1613.1 153H1648.1A18 18 0 0 1 1666.1 171V195A18 18 0 0 1 1648.1 213H1613.1A18 18 0 0 1 1595.1 195V171A18 18 0 0 1 1613.1 153ZM1614.1 163H1647.1A8.5 8.5 0 0 1 1655.6 171.5V194.5A8.5 8.5 0 0 1 1647.1 203H1614.1A8.5 8.5 0 0 1 1605.6 194.5V171.5A8.5 8.5 0 0 1 1614.1 163ZM1709 212L1709 154L1720 154L1759.5 198L1759.5 154L1770 154L1770 212L1759 212L1719.5 168L1719.5 212Z"/>`;

interface JourneyProps {
  hero: HomeContent["hero"];
  intro: HomeContent["intro"];
  visionMission: HomeContent["visionMission"];
  community: HomeContent["community"];
  /** Trackside LED boards on the 3D course: [0] the website's designer, [1] the founder. */
  trackside?: Array<{ name: string; line: string; tail?: string }>;
  /**
   * "cinematic" (default): the 3D golf-course journey.
   * "story": the same content as plain stacked sections, with no 3D and no
   * hero (used under the falling-ball hero).
   */
  variant?: "cinematic" | "story";
}

export function Journey({ hero, intro, visionMission, community, trackside, variant = "cinematic" }: JourneyProps) {
  const story = variant === "story";
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);
  const lenisRef = useRef<import("lenis").default | undefined>(undefined);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || story) return;
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

    let rebuild: (() => void) | undefined;
    // If the browser's graphics drop the 3D view (low memory, driver reset),
    // show the static backdrop instead of a half-black frame, then rebuild it.
    let quality = early?.quality ?? detectQuality();
    const onLost = (e: Event) => {
      e.preventDefault();
      root.removeAttribute("data-ready");
      root.setAttribute("data-rebuilding", "");
      // Rebuild lighter, so the same heavy view doesn't drop it again.
      quality = lowerQuality(quality);
    };
    const onRestored = () => rebuild?.();
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    (async () => {
      try {
        const [{ Experience }, LenisModule] = await Promise.all([
          early?.engine ?? import("@/experience/engine/Experience"),
          reduced ? Promise.resolve(undefined) : import("lenis"),
          early?.surfaces ?? prefetchSurfaces(quality.textureSize),
        ]);
        if (cancelled) return;
        await document.fonts.ready;
        const font = getComputedStyle(document.documentElement).getPropertyValue("--font-clash").trim() || "sans-serif";
        await document.fonts.load(`600 100px ${font}`).catch(() => undefined);
        if (cancelled) return;
        // A small copy of the latest frame. If the browser's graphics drop the
        // 3D view, this is shown while it is rebuilt — instead of a black screen.
        const still = stillRef.current;
        const keepStill = (src: HTMLCanvasElement) => {
          if (!still || !src.width) return;
          const w = Math.min(640, src.width);
          const h = Math.round((w * src.height) / src.width);
          if (still.width !== w || still.height !== h) {
            still.width = w;
            still.height = h;
          }
          try {
            still.getContext("2d")?.drawImage(src, 0, 0, w, h);
          } catch {
            /* not available on this browser */
          }
        };
        const create = async () => {
          const e = new Experience({
            canvas,
            quality,
            onFrame: keepStill,
            text: { title: hero.title, taglineTop: hero.taglineLines[0], taglineBottom: hero.taglineLines[1], font, trackside },
          });
          engine = e;
          await e.prepare();
          if (cancelled || engine !== e) return;
          e.setProgress(reduced ? quantizeToStill(progress()) : progress());
          e.renderNow();
          root.setAttribute("data-ready", "");
          root.removeAttribute("data-rebuilding");
        };
        rebuild = () => {
          if (cancelled) return;
          try {
            engine?.dispose();
          } catch {
            /* already gone */
          }
          void create();
        };
        await create();
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
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      lockObserver.disconnect();
      lenis?.destroy();
      lenisRef.current = undefined;
      engine?.dispose();
    };
  }, [hero, story]);

  /** Skip to the finale (SL logo over the lit course): an instant cut, no fade to black. */
  const skipIntro = () => {
    const root = rootRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top + window.scrollY;
    const y = top + SKIP_TO * (root.offsetHeight - window.innerHeight);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: "instant" });
  };

  return (
    <div ref={rootRef} className={styles.journey} data-journey-root={story ? undefined : ""} data-variant={variant}>
      <div className={styles.stage}>
        {!story && (
          <div className={styles.backdrop} aria-hidden="true">
            <div className={styles.glow} />
            <div className={styles.floor} />
          </div>
        )}
        <canvas ref={stillRef} className={styles.still} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.scenes}>
          {!story && (
            <>
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
            </>
          )}

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

          {!story && (
            <div data-scene="finale" className={`${styles.scene} ${styles.finale}`}>
              {/* Drawn inline (not a separate image file), so it can never show as a broken image. */}
              <svg className={styles.finaleLogo} viewBox="0 0 1806 250" width={420} height={58} aria-hidden="true" dangerouslySetInnerHTML={{ __html: FINALE_LOGO }} />
              <p>{hero.supporting}</p>
            </div>
          )}
        </div>

        {!story && (
          <button type="button" className={styles.skip} onClick={skipIntro}>
            Skip intro <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>
    </div>
  );
}
