/**
 * Master timeline of the homepage experience.
 *
 * All values are fractions of total scroll progress (0 → 1) through the
 * journey. The 3D engine (camera, ball, putter, lights) and the DOM text
 * overlays both read from this single source, so they stay in sync and
 * reverse together.
 *
 * This file is part of the fixed experience — it is intentionally NOT
 * CMS-configurable. It imports nothing from three.js so UI code can use it.
 */

export const P = {
  /** Darkness → emerald light → environment → green → ball. */
  revealEnd: 0.07,
  /** Brand introduction over a slow push towards the ball. */
  brandEnd: 0.15,
  /** Putter enters, backswing, impact, follow-through. */
  swingEnd: 0.24,
  /** Starting green and elevated ramp. */
  rampEnd: 0.33,
  /** Elevated deck — association introduction panel. */
  deckEnd: 0.4,
  /** Illuminated tunnel through the hall wall — vision & mission. */
  tunnelEnd: 0.52,
  /** Banked S-curves outdoors. */
  curvesEnd: 0.6,
  /** Bridge over the water channel. */
  bridgeEnd: 0.66,
  /** Rotating gate, rail bank shot, stone arch. */
  obstaclesEnd: 0.76,
  /** Final curve and putting green up to the cup lip. */
  greenEnd: 0.88,
  /** Ball drops into the cup. */
  dropEnd: 0.905,
  /** Finale: crane shot over the whole lit course. */
  end: 1,
} as const;

/** Moment of impact within the swing chapter (0–1). */
export const IMPACT_U = 0.8;
export const P_IMPACT = P.brandEnd + IMPACT_U * (P.swingEnd - P.brandEnd);

export interface SceneRange {
  from: number;
  to: number;
  /** Fade length at each end. */
  fade: number;
}

/** When each text overlay is visible. Keys match `data-scene` in the DOM. */
export const SCENES = {
  cue: { from: -1, to: 0.03, fade: 0.012 },
  hero: { from: 0.07, to: 0.152, fade: 0.012 },
  short: { from: 0.25, to: 0.325, fade: 0.01 },
  intro: { from: 0.335, to: 0.4, fade: 0.01 },
  vision: { from: 0.418, to: 0.468, fade: 0.008 },
  mission: { from: 0.47, to: 0.52, fade: 0.008 },
  community0: { from: 0.53, to: 0.595, fade: 0.008 },
  community1: { from: 0.603, to: 0.655, fade: 0.008 },
  community2: { from: 0.664, to: 0.707, fade: 0.008 },
  community3: { from: 0.712, to: 0.757, fade: 0.008 },
  finale: { from: 0.935, to: 2, fade: 0.02 },
} satisfies Record<string, SceneRange>;

export type SceneId = keyof typeof SCENES;

/** "Skip intro" jumps to the end of the journey: the finale with the SL logo. */
export const SKIP_TO = 0.99;

/** The skip button is offered until the finale begins. */
export const SKIP_UNTIL = SCENES.finale.from - 0.01;

/**
 * Held frames for visitors who prefer reduced motion: the experience cuts
 * between these moments instead of animating continuously.
 */
export const STILLS = [0.045, 0.11, 0.2, 0.29, 0.37, 0.445, 0.495, 0.565, 0.63, 0.685, 0.735, 0.85, 0.97];

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function sceneOpacity(range: SceneRange, p: number): number {
  return smoothstep(range.from, range.from + range.fade, p) * (1 - smoothstep(range.to - range.fade, range.to, p));
}

export function quantizeToStill(p: number): number {
  let best = STILLS[0];
  for (const s of STILLS) if (Math.abs(s - p) < Math.abs(best - p)) best = s;
  return best;
}
