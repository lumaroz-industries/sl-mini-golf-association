"use client";

import { useEffect, useState } from "react";
import s from "./intro.module.css";

export interface IntroPerson {
  name: string;
  role: string;
  portrait?: string;
}

/** In the installed app, coming back after this long counts as opening it again. */
const REOPEN_AFTER_MS = 60_000;

/**
 * Opening animation for the admin (website and the SL Admin app, which opens
 * the same page): the SL logo with a gold light sweep and "Admin Panel",
 * then the people behind the platform, then a fade into the admin.
 *
 * It is rendered on the server and runs on pure CSS, so it is on screen from
 * the very first frame (no blank screen while scripts load). On the website
 * it plays when /admin itself is loaded or refreshed (and on the sign-in page
 * that /admin leads to when signed out) — not when another admin page such
 * as Updates or Gallery is refreshed, and never when moving between pages.
 * The app always starts at /admin, so it plays every time the app opens; it also
 * plays when the app is reopened from the background after a minute away
 * (short switches, like picking a photo to upload, don't trigger it).
 * Tap anywhere to skip.
 */
export function AdminIntro({ people }: { people: IntroPerson[] }) {
  const [gone, setGone] = useState(false);
  const [skip, setSkip] = useState(false);
  const [run, setRun] = useState(0);

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

  if (gone) return null;
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
          if (e.target === e.currentTarget) setGone(true);
        }}
      >
        <div className={s.glow} />
        <div className={s.grain} />

        <div className={s.brand}>
          <div className={s.logoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.logo} src="/brand/slmga-logo-dark.svg" alt="" width={520} height={120} fetchPriority="high" />
            <span className={s.shine} />
          </div>
          <span className={s.rule} />
          <p className={s.label}>Admin Panel</p>
          <p className={s.sub}>Content studio · Authorised access only</p>
        </div>

        <div className={s.team}>
          <p className={s.teamKicker}>The people behind the platform</p>
          <div className={s.people}>
            {people.map((p, i) => (
              <div key={p.name} className={s.person} style={{ "--i": i } as React.CSSProperties}>
                <span className={s.ring}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.portrait ? <img src={p.portrait} alt="" width={160} height={160} fetchPriority="high" /> : <span className={s.initials}>{p.name.split(" ").map((w) => w[0]).join("")}</span>}
                </span>
                <span className={s.name}>{p.name}</span>
                <span className={s.role}>{p.role}</span>
              </div>
            ))}
          </div>
        </div>

        <span className={s.skip}>Tap to skip</span>
      </div>
    </>
  );
}
