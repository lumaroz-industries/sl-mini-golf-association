"use client";

import type { Cue } from "@/sections/home/introSound";

/**
 * Sound for the admin opening, on the same synthesiser as the homepage's
 * (src/sections/home/introSound.ts), timed to intro.module.css.
 */
export const ADMIN_CUES: Cue[] = [
  // The gold beam opens and the logo slams in; a bell on the light sweep.
  { at: 0.0, play: (a, t) => a.swell(t, [98, 146.83, 196], 1.5, 0.2) },
  { at: 0.2, play: (a, t) => a.thud(t, 0.42) },
  { at: 0.65, play: (a, t) => a.bell(t, [987.77, 1479.98], 0.15) },
  // The gold slash cuts the screen.
  { at: 1.2, play: (a, t) => a.whoosh(t, 0.55, 0.34) },
  // The founder lands (gold), then the designer (crystal bells and shimmer).
  { at: 1.55, play: (a, t) => a.thud(t, 0.34) },
  { at: 1.6, play: (a, t) => a.swell(t, [196, 246.94, 293.66], 1.4, 0.12) },
  { at: 1.75, play: (a, t) => a.arpeggio(t, [1318.5, 1760, 2349.32, 3135.96], 0.07, 0.13) },
  { at: 1.9, play: (a, t) => a.shimmer(t, 0.9, 0.28) },
  // "Access granted": a stamp and a bright chord.
  { at: 2.72, play: (a, t) => a.thud(t, 0.46) },
  { at: 2.74, play: (a, t) => a.bell(t, [783.99, 1174.66, 1567.98], 0.14) },
  // The halves slide apart onto the admin.
  { at: 3.45, play: (a, t) => a.whoosh(t, 0.65, 0.3) },
  { at: 3.6, play: (a, t) => a.swell(t, [392, 587.33, 783.99], 1.2, 0.07) },
];
