/**
 * Device quality tiers. Chosen once on load from device signals; can be
 * forced for testing with `?quality=high|medium|low`.
 */
export type QualityTier = "high" | "medium" | "low";

export interface QualitySettings {
  tier: QualityTier;
  maxPixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  msaa: number;
  grassTufts: number;
  bushes: number;
  trees: number;
  textureSize: number;
}

const SETTINGS: Record<QualityTier, QualitySettings> = {
  high: { tier: "high", maxPixelRatio: 2, shadows: true, shadowMapSize: 2048, bloom: true, msaa: 4, grassTufts: 5000, bushes: 170, trees: 90, textureSize: 1024 },
  medium: { tier: "medium", maxPixelRatio: 1.5, shadows: true, shadowMapSize: 1024, bloom: true, msaa: 2, grassTufts: 1600, bushes: 110, trees: 60, textureSize: 512 },
  low: { tier: "low", maxPixelRatio: 1, shadows: false, shadowMapSize: 512, bloom: false, msaa: 0, grassTufts: 0, bushes: 40, trees: 26, textureSize: 256 },
};

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

export function detectQuality(): QualitySettings {
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "high" || forced === "medium" || forced === "low") return SETTINGS[forced];

  const nav = navigator as NavigatorWithMemory;
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  // Data saver on, a slow connection or a very modest device: the lightest version.
  const slow = nav.connection?.saveData || /(^|-)2g|3g/.test(nav.connection?.effectiveType ?? "");
  if (slow || memory <= 2 || cores <= 2) return SETTINGS.low;

  if (coarse || small) return SETTINGS[memory >= 6 && cores >= 8 ? "medium" : "low"];
  if (memory <= 4 || cores <= 4) return SETTINGS.medium;
  return SETTINGS.high;
}

export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
