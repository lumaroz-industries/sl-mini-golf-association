"use client";

import { useEffect, useState } from "react";
import s from "./SiteIntro.module.css";

/** Set once the intro has played in this browser tab. */
const KEY = "sl-intro";

/**
 * Opening animation for the homepage — the website's version of the admin
 * intro, in emerald: the SL logo with a light sweep and the tagline, then it
 * opens up into the 3D course (≈2.3 s). It hides the course loading behind it.
 *
 * Server-rendered and pure CSS, so it is on screen from the first frame. It
 * is mounted by the site layout and plays only when the homepage itself is
 * opened, once per browser tab (coming back to the homepage later in the same
 * tab skips it). Tap anywhere to skip.
 */
export function SiteIntro({ tagline }: { tagline: string[] }) {
  const [gone, setGone] = useState(false);
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    // Not playing (another page, or already seen): drop it from the page.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off check after hydration
    if (document.documentElement.dataset.siteIntro === "skip") setGone(true);
  }, []);
  if (gone) return null;
  return (
    <>
      {/* Runs before the overlay is painted, so repeat visits never flash it. Decides once per page load (safe if run again). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var d=document.documentElement.dataset;if(!d.siteIntro){if(location.pathname!=="/"||sessionStorage.getItem("${KEY}"))d.siteIntro="skip";else{d.siteIntro="play";sessionStorage.setItem("${KEY}","1")}}}catch(e){}`,
        }}
      />
      <div
        className={s.intro}
        data-skip={skip || undefined}
        aria-hidden="true"
        onClick={() => setSkip(true)}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setGone(true);
        }}
      >
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
        <span className={s.skip}>Tap to skip</span>
      </div>
    </>
  );
}
