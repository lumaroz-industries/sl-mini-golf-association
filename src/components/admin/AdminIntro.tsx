"use client";

import { useEffect, useState } from "react";
import s from "./intro.module.css";

export interface IntroPerson {
  name: string;
  role: string;
  portrait?: string;
}

const KEY = "slmga-admin-intro";

/**
 * Opening animation for the admin (website and the SL Admin app, which opens
 * the same page): the SL logo with a gold light sweep and "Admin Panel",
 * then the people behind the platform, then a fade into the admin.
 *
 * It is rendered on the server and runs on pure CSS, so it is on screen from
 * the very first frame (no blank screen while scripts load). It plays once
 * per visit — opening the app or a new tab — not on every page change or
 * refresh. Tap anywhere to skip.
 */
export function AdminIntro({ people }: { people: IntroPerson[] }) {
  const [gone, setGone] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.adminIntro === "seen") setGone(true);
  }, []);

  if (gone) return null;
  return (
    <>
      {/* Runs before the overlay is painted: a repeat visit in the same session skips it entirely. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("${KEY}")){document.documentElement.dataset.adminIntro="seen"}else{sessionStorage.setItem("${KEY}","1")}}catch(e){}`,
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
