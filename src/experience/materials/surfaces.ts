/**
 * Pure pixel generators for the course surfaces (turf, lawn, concrete,
 * stone). No DOM and no three.js, so they can run in a Web Worker while the
 * 3D engine downloads (see surfaceCache.ts).
 */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise, summed over octaves. Returns values in 0..1. */
export function fbm(size: number, seed: number, octaves = 5, baseCells = 4): Float32Array {
  const out = new Float32Array(size * size);
  const rand = mulberry32(seed);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = baseCells << o;
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * cells;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const x1 = (x0 + 1) % cells;
        const y1 = (y0 + 1) % cells;
        const a = grid[y0 * cells + x0];
        const b = grid[y0 * cells + x1];
        const c = grid[y1 * cells + x0];
        const d = grid[y1 * cells + x1];
        out[y * size + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

type RGB = [number, number, number];

/** Fills an RGBA pixel buffer (no DOM — runs in a worker too). */
function paint(size: number, fn: (i: number, x: number, y: number) => RGB): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const [r, g, b] = fn(i, x, y);
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    }
  }
  return data;
}

export interface SurfacePixels {
  map: Uint8ClampedArray;
  bump: Uint8ClampedArray;
}

/** Artificial turf: dense fibres with subtle directional grain. */
export function turfPixels(size: number): SurfacePixels {
  const n = fbm(size, 11, 3, 8);
  const rand = mulberry32(5);
  const fibre = new Float32Array(size * size);
  for (let i = 0; i < fibre.length; i++) fibre[i] = rand();
  const map = paint(size, (i) => {
    const v = 0.78 + 0.22 * n[i] + (fibre[i] - 0.5) * 0.28;
    return [Math.min(255, 22 * v), Math.min(255, 104 * v), Math.min(255, 58 * v)];
  });
  const bump = paint(size, (i) => {
    const v = 255 * (0.25 + 0.75 * fibre[i] * (0.6 + 0.4 * n[i]));
    return [v, v, v];
  });
  return { map, bump };
}

/** Darker, coarser lawn for the outdoor ground. */
export function lawnPixels(size: number): SurfacePixels {
  const n = fbm(size, 21, 5, 4);
  const rand = mulberry32(9);
  const map = paint(size, (i) => {
    const v = 0.55 + 0.45 * n[i] + (rand() - 0.5) * 0.2;
    return [10 * v, 38 * v, 22 * v];
  });
  const bump = paint(size, (i) => {
    const v = 255 * (0.3 + 0.7 * n[i]);
    return [v, v, v];
  });
  return { map, bump };
}

/** Polished dark concrete with soft mottling. */
export function concretePixels(size: number, tone = 1): SurfacePixels {
  const n = fbm(size, 31, 6, 3);
  const rand = mulberry32(3);
  const map = paint(size, (i) => {
    const v = (0.82 + 0.3 * (n[i] - 0.5) + (rand() - 0.5) * 0.05) * tone;
    return [36 * v, 40 * v, 39 * v];
  });
  const bump = paint(size, (i) => {
    const v = 255 * n[i];
    return [v, v, v];
  });
  return { map, bump };
}

/** Irregular stone blocks with mortar joints. */
export function stonePixels(size: number): SurfacePixels {
  const n = fbm(size, 41, 5, 6);
  const rand = mulberry32(77);
  const rows = 4;
  const rowH = size / rows;
  const blocks: { y: number; xs: number[]; tone: number[] }[] = [];
  for (let r = 0; r < rows; r++) {
    const xs: number[] = [];
    const tone: number[] = [];
    let x = -rand() * size * 0.3;
    while (x < size) {
      xs.push(x);
      tone.push(0.75 + rand() * 0.35);
      x += size * (0.22 + rand() * 0.2);
    }
    blocks.push({ y: r * rowH, xs, tone });
  }
  const joint = new Float32Array(size * size);
  const toneMap = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const row = blocks[Math.floor(y / rowH)];
    const dy = Math.min(y - row.y, row.y + rowH - y);
    for (let x = 0; x < size; x++) {
      let k = 0;
      while (k + 1 < row.xs.length && row.xs[k + 1] <= x) k++;
      const left = x - row.xs[k];
      const right = (row.xs[k + 1] ?? size + row.xs[0]) - x;
      const d = Math.min(dy, left, right);
      const i = y * size + x;
      joint[i] = Math.min(1, d / (size * 0.012));
      toneMap[i] = row.tone[k];
    }
  }
  const map = paint(size, (i) => {
    const v = toneMap[i] * (0.7 + 0.5 * n[i]) * (0.35 + 0.65 * joint[i]);
    return [92 * v, 94 * v, 88 * v];
  });
  const bump = paint(size, (i) => {
    const v = 255 * joint[i] * (0.6 + 0.4 * n[i]);
    return [v, v, v];
  });
  return { map, bump };
}


export type SurfaceKind = "turf" | "lawn" | "concrete" | "stone";

export const SURFACES: Record<SurfaceKind, (size: number) => SurfacePixels> = {
  turf: turfPixels,
  lawn: lawnPixels,
  concrete: concretePixels,
  stone: stonePixels,
};
