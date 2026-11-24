import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Procedural textures, generated on the client at load time.
 * Nothing is downloaded; every surface detail is made here.
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
function fbm(size: number, seed: number, octaves = 5, baseCells = 4): Float32Array {
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

function canvasOf(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function finish(canvas: HTMLCanvasElement, color: boolean, repeat = true): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  if (color) tex.colorSpace = SRGBColorSpace;
  return tex;
}

type RGB = [number, number, number];

function paint(size: number, fn: (i: number, x: number, y: number) => RGB) {
  const { canvas, ctx } = canvasOf(size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const [r, g, b] = fn(i, x, y);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface SurfaceTextures {
  map: Texture;
  bump: Texture;
}

/** Artificial turf: dense fibres with subtle directional grain. */
export function turfTextures(size: number): SurfaceTextures {
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
  return { map: finish(map, true), bump: finish(bump, false) };
}

/** Darker, coarser lawn for the outdoor ground. */
export function lawnTextures(size: number): SurfaceTextures {
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
  return { map: finish(map, true), bump: finish(bump, false) };
}

/** Polished dark concrete with soft mottling. */
export function concreteTextures(size: number, tone = 1): SurfaceTextures {
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
  return { map: finish(map, true), bump: finish(bump, false) };
}

/** Irregular stone blocks with mortar joints. */
export function stoneTextures(size: number): SurfaceTextures {
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
  return { map: finish(map, true), bump: finish(bump, false) };
}

/** Golf-ball dimples as a bump map (equirectangular, mapped on a sphere). */
export function dimpleTexture(size: number): Texture {
  const { canvas, ctx } = canvasOf(size);
  canvas.height = size / 2;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size / 2);
  const rows = 18;
  for (let r = 0; r <= rows; r++) {
    const lat = (r / rows) * Math.PI;
    const ring = Math.max(1, Math.round(2 * rows * Math.sin(lat)));
    const y = (r / rows) * (size / 2);
    const rad = (size / (rows * 4.2)) * 1;
    for (let k = 0; k < ring; k++) {
      const x = ((k + (r % 2) * 0.5) / ring) * size;
      const rx = rad / Math.max(0.25, Math.sin(lat));
      for (const ox of [x, x - size, x + size]) {
        const g = ctx.createRadialGradient(ox, y, 0, ox, y, rad);
        g.addColorStop(0, "#5a5a5a");
        g.addColorStop(1, "#ffffff");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(ox, y, rx, rad, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = finish(canvas, false, false);
  tex.wrapS = RepeatWrapping;
  return tex;
}

/** Soft ripples for water (used as a scrolling bump map). */
export function rippleTexture(size: number): Texture {
  const n = fbm(size, 51, 4, 6);
  const canvas = paint(size, (i) => {
    const v = 255 * n[i];
    return [v, v, v];
  });
  return finish(canvas, false);
}

/** Radial falloff used for contact shadows and glows. */
export function radialTexture(size = 128, inner = "rgba(0,0,0,0.85)", outer = "rgba(0,0,0,0)"): Texture {
  const { canvas, ctx } = canvasOf(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  return tex;
}

export interface TextOptions {
  font: string;
  weight?: number;
  letterSpacing?: number; // em
  lines: string[];
  lineHeight?: number; // em
  size?: number; // px font size on the canvas
  align?: CanvasTextAlign;
}

/** Renders text to a transparent texture. Returns the texture and its aspect. */
export function textTexture(opts: TextOptions): { texture: Texture; aspect: number } {
  const size = opts.size ?? 160;
  const weight = opts.weight ?? 600;
  const lh = (opts.lineHeight ?? 1.0) * size;
  const spacing = (opts.letterSpacing ?? 0) * size;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${weight} ${size}px ${opts.font}`;
  const widthOf = (line: string) => {
    let w = 0;
    for (const ch of line) w += measure.measureText(ch).width + spacing;
    return w - spacing;
  };
  const pad = size * 0.4;
  const w = Math.ceil(Math.max(...opts.lines.map(widthOf)) + pad * 2);
  const h = Math.ceil(lh * opts.lines.length + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${weight} ${size}px ${opts.font}`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  opts.lines.forEach((line, li) => {
    const lw = widthOf(line);
    let x = opts.align === "left" ? pad : (w - lw) / 2;
    const y = pad + lh * (li + 0.5);
    for (const ch of line) {
      ctx.fillText(ch, x, y);
      x += measure.measureText(ch).width + spacing;
    }
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: w / h };
}

/**
 * Repeating LED band for the course rails (like the LED boards around a
 * stadium): on a dark pixel panel, one tag per person — name, title and
 * handle — with an empty stretch the length of a whole tag after each:
 * designer (gold) · gap · founder (silver) · gap. Tiles seamlessly.
 */
export function ledRibbonTexture(opts: { font: string; people: Array<{ name: string; line: string; tail?: string }> }): { texture: Texture; aspect: number } {
  // Kept small: the whole repeat must stay well under 8192 px (the texture
  // limit of many laptop GPUs) — about 4 000 px wide at this size.
  const H = 64;
  const nameSize = 39;
  const smallSize = 17;
  const gap = 23;
  const measureCtx = document.createElement("canvas").getContext("2d")!;
  const measure = (txt: string, size: number, spacing: number) => {
    measureCtx.font = `600 ${size}px ${opts.font}`;
    let w = 0;
    for (const ch of txt) w += (ch === " " ? size * 0.38 : measureCtx.measureText(ch).width) + spacing * size;
    return w - spacing * size;
  };
  type Item = { text: string; size: number; spacing: number; fill: "gold" | "silver" | "white" | "goldSoft" } | { diamond: true } | { blank: number };
  const widthOf = (it: Item) => ("diamond" in it ? 8 : "blank" in it ? it.blank : measure(it.text, it.size, it.spacing));
  const tag = (p: { name: string; line: string; tail?: string }, metal: "gold" | "silver"): Item[] => {
    const t: Item[] = [{ text: p.name, size: nameSize, spacing: 0.05, fill: metal }, { diamond: true }, { text: p.line, size: smallSize, spacing: 0.2, fill: "white" }];
    if (p.tail) t.push({ diamond: true }, { text: p.tail, size: smallSize, spacing: 0.16, fill: metal === "gold" ? "goldSoft" : "white" });
    return t;
  };
  const tagWidth = (t: Item[]) => t.reduce((w, it) => w + widthOf(it) + gap, 0) - gap;
  const items: Item[] = [];
  for (const [k, p] of opts.people.entries()) {
    const t = tag(p, k === 0 ? "gold" : "silver");
    // Each tag, then an empty stretch as long as a whole tag.
    items.push(...t, { blank: tagWidth(t) });
  }

  const W = Math.ceil(items.reduce((w, it) => w + widthOf(it) + gap, 0));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#020403";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "middle";
  const y = H / 2 + 2;
  const gold = ctx.createLinearGradient(0, y - nameSize / 2, 0, y + nameSize / 2);
  gold.addColorStop(0, "#fff3d0");
  gold.addColorStop(0.5, "#f0cd7c");
  gold.addColorStop(1, "#c39a4c");
  const silver = ctx.createLinearGradient(0, y - nameSize / 2, 0, y + nameSize / 2);
  silver.addColorStop(0, "#ffffff");
  silver.addColorStop(0.55, "#d5dadc");
  silver.addColorStop(1, "#9aa3a7");
  const fills = { gold, silver, white: "#e6ecea", goldSoft: "#e3c27a" };

  let x = gap / 2;
  for (const it of items) {
    if ("blank" in it) {
      // empty stretch of LED panel
    } else if ("diamond" in it) {
      ctx.save();
      ctx.translate(x + 4, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#19d18c";
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    } else {
      ctx.font = `600 ${it.size}px ${opts.font}`;
      ctx.fillStyle = fills[it.fill];
      let cx = x;
      for (const ch of it.text) {
        if (ch !== " ") ctx.fillText(ch, cx, y);
        cx += (ch === " " ? it.size * 0.38 : ctx.measureText(ch).width) + it.spacing * it.size;
      }
    }
    x += widthOf(it) + gap;
  }

  // LED pixel grid.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  for (let gx = 0; gx < W; gx += 2) ctx.fillRect(gx, 0, 0.65, H);
  for (let gy = 0; gy < H; gy += 2) ctx.fillRect(0, gy, W, 0.65);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 8;
  return { texture, aspect: W / H };
}
