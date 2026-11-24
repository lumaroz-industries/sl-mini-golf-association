import { CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { fbm, SURFACES, type SurfaceKind } from "./surfaces";
import { takeSurface } from "./surfaceCache";

export { mulberry32 } from "./surfaces";

/**
 * Procedural textures, generated on the client at load time.
 * Nothing is downloaded; every surface detail is made here.
 */

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

export interface SurfaceTextures {
  map: Texture;
  bump: Texture;
}

function surfaceTexture(data: Uint8ClampedArray, size: number, color: boolean): Texture {
  const tex = new DataTexture(data, size, size, RGBAFormat);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 8;
  if (color) tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Surface textures, from the pixels prepared in the background (or made now if they aren't ready). */
function surface(kind: SurfaceKind, size: number): SurfaceTextures {
  const px = takeSurface(kind, size) ?? SURFACES[kind](size);
  return { map: surfaceTexture(px.map, size, true), bump: surfaceTexture(px.bump, size, false) };
}

/** Artificial turf: dense fibres with subtle directional grain. */
export const turfTextures = (size: number) => surface("turf", size);
/** Darker, coarser lawn for the outdoor ground. */
export const lawnTextures = (size: number) => surface("lawn", size);
/** Polished dark concrete with soft mottling. */
export const concreteTextures = (size: number) => surface("concrete", size);
/** Irregular stone blocks with mortar joints. */
export const stoneTextures = (size: number) => surface("stone", size);

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
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < n.length; i++) {
    const v = 255 * n[i];
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return surfaceTexture(data, size, false);
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
