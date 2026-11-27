"use client";

import { FRAME } from "@/lib/admin/studio";

/**
 * In-browser portrait cut-out with MODNet (Apache-2.0) on ONNX Runtime Web
 * (MIT). Both are self-hosted under /public, so photos never leave the
 * device and nothing is paid for. First use downloads ~7 MB + ~11 MB, then
 * the browser caches them.
 */

const ORT_URL = "/vendor/ort/ort.wasm.min.mjs";
const MODEL_URL = "/models/modnet/model.onnx";

/* Just the bits of onnxruntime-web this file uses. */
interface OrtTensor {
  data: Float32Array;
  dims: readonly number[];
}
interface OrtSession {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}
interface Ort {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => OrtTensor;
  InferenceSession: { create(model: ArrayBuffer | Uint8Array, opts?: object): Promise<OrtSession> };
}

let session: Promise<{ ort: Ort; s: OrtSession }> | null = null;

async function fetchWithProgress(url: string, onProgress?: (share: number) => void) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("Could not download the cut-out engine. Check your connection and try again.");
  const total = Number(res.headers.get("content-length") ?? 0);
  if (!total || !onProgress) return new Uint8Array(await res.arrayBuffer());
  const out = new Uint8Array(total);
  const reader = res.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > out.length) return new Uint8Array(await new Response(new Blob([out.subarray(0, got), value])).arrayBuffer()); // size header was wrong
    out.set(value, got);
    got += value.length;
    onProgress(got / total);
  }
  return out.subarray(0, got);
}

export function loadEngine(onProgress?: (share: number) => void) {
  session ??= (async () => {
    const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ ORT_URL)) as Ort;
    ort.env.wasm.wasmPaths = "/vendor/ort/";
    ort.env.wasm.numThreads = 1;
    const model = await fetchWithProgress(MODEL_URL, onProgress);
    const s = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    return { ort, s };
  })().catch((e) => {
    session = null;
    throw e;
  });
  return session;
}

export interface Cutout {
  /** The photo, upright, at most 2400 px on its long side. */
  photo: HTMLCanvasElement;
  /** Alpha matte at the photo's size (white = person). */
  matte: HTMLCanvasElement;
  /** Suggested framing (see `autoFrame`). */
  frame: Framing;
}

/** Where the photo goes in the 960×1200 card frame: scale and the photo point placed at the frame's centre-top reference. */
export interface Framing {
  /** Output pixels per photo pixel. */
  scale: number;
  /** Photo x that lands on the frame's centre line. */
  cx: number;
  /** Photo y that lands on FRAME.headTop. */
  top: number;
  /** True when the head was found; false = a rough fit from the outline. */
  confident: boolean;
}

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export async function cutOut(file: Blob, onProgress?: (share: number) => void): Promise<Cutout> {
  const { ort, s } = await loadEngine(onProgress);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This file can't be opened. Use a JPG, PNG or WebP image.");
  }
  const k = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const W = Math.round(bitmap.width * k);
  const H = Math.round(bitmap.height * k);
  const photo = canvas(W, H);
  const pctx = photo.getContext("2d")!;
  pctx.imageSmoothingQuality = "high";
  pctx.drawImage(bitmap, 0, 0, W, H);
  bitmap.close();

  // MODNet input: shortest edge 512, both sides multiples of 32, (x/255 − 0.5)/0.5.
  const r = 512 / Math.min(W, H);
  const mw = Math.max(32, Math.round((W * r) / 32) * 32);
  const mh = Math.max(32, Math.round((H * r) / 32) * 32);
  const small = canvas(mw, mh);
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(photo, 0, 0, mw, mh);
  const px = sctx.getImageData(0, 0, mw, mh).data;
  const n = mw * mh;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    input[i] = px[i * 4] / 127.5 - 1;
    input[n + i] = px[i * 4 + 1] / 127.5 - 1;
    input[2 * n + i] = px[i * 4 + 2] / 127.5 - 1;
  }
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, mh, mw]) });
  const alpha = out[s.outputNames[0]].data;

  // Tighten the matte a little: drops the faint halo of old background at the edges.
  const m = sctx.createImageData(mw, mh);
  for (let i = 0; i < n; i++) {
    const a = Math.min(1, Math.max(0, (alpha[i] - 0.08) / 0.84));
    m.data[i * 4] = m.data[i * 4 + 1] = m.data[i * 4 + 2] = 255;
    m.data[i * 4 + 3] = Math.round(a * 255);
  }
  sctx.putImageData(m, 0, 0);
  const matte = canvas(W, H);
  const mctx = matte.getContext("2d")!;
  mctx.imageSmoothingQuality = "high";
  mctx.drawImage(small, 0, 0, W, H);

  return { photo, matte, frame: autoFrame(alpha, mw, mh, W / mw) };
}

/**
 * Finds the head in the matte and works out the framing that puts the top of
 * the hair at FRAME.headTop and makes the head FRAME.headWidth wide. Walks
 * down from the top of the person: the outline widens over the head, narrows
 * at the neck, then widens fast at the shoulders.
 */
export function autoFrame(alpha: Float32Array, w: number, h: number, toPhoto: number): Framing {
  const on = (x: number, y: number) => alpha[y * w + x] > 0.5;
  let top = -1;
  let left = w;
  let right = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (on(x, y)) {
        if (top < 0) top = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
  if (top < 0) return { scale: FRAME.width / (w * toPhoto), cx: (w * toPhoto) / 2, top: 0, confident: false };

  // Width of the run of "person" pixels through the head's centre line, row by row.
  let cx = 0;
  let count = 0;
  for (let x = 0; x < w; x++) if (on(x, top)) (cx += x), count++;
  cx = Math.round(cx / count);
  const run = (y: number) => {
    let a = cx;
    let b = cx;
    if (!on(cx, y)) return { a, b, width: 0 };
    while (a > 0 && on(a - 1, y)) a--;
    while (b < w - 1 && on(b + 1, y)) b++;
    return { a, b, width: b - a + 1 };
  };

  let headW = 0;
  let headCx = cx;
  let neck = -1;
  let neckW = Infinity;
  for (let y = top; y < h; y++) {
    const r = run(y);
    if (!r.width) break;
    if (neck < 0) {
      if (r.width > headW) {
        headW = r.width;
        headCx = (r.a + r.b) / 2;
      } else if (headW > 8 && r.width < headW * 0.85) neck = y;
    }
    if (neck >= 0) {
      if (r.width < neckW) neckW = r.width;
      if (r.width > headW * 1.6) {
        // Shoulders reached: sanity-check the head's proportions.
        const headH = y - top;
        if (headH > headW * 0.8 && headH < headW * 2.4) {
          const scale = (FRAME.headWidth * FRAME.width) / (headW * toPhoto);
          return { scale, cx: headCx * toPhoto, top: top * toPhoto, confident: true };
        }
        break;
      }
    }
    // Recentre on the narrowest part (the neck) so tilted heads still track.
    cx = Math.round((r.a + r.b) / 2);
  }

  // Fallback: fit the outline's width to 85% of the frame.
  const scale = (0.85 * FRAME.width) / ((right - left + 1) * toPhoto);
  return { scale, cx: ((left + right) / 2) * toPhoto, top: top * toPhoto, confident: false };
}

export type Backdrop = "green" | "black" | "gold" | "champagne" | "ember" | "original";

export const BACKDROPS: Array<{ id: Backdrop; label: string }> = [
  { id: "green", label: "Green studio" },
  { id: "black", label: "Black studio" },
  { id: "gold", label: "Gold spotlight" },
  { id: "champagne", label: "Champagne (National card)" },
  { id: "ember", label: "Ember (State card)" },
  { id: "original", label: "Keep original" },
];

/** Small seeded random generator, so every card gets the same backdrop. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface StudioLook {
  /** Darkest and lightest colours of the smoke backdrop (r, g, b). */
  dark: [number, number, number];
  light: [number, number, number];
  /** Contrast of the smoke (higher = more patchy). */
  gamma: number;
  /** Thin rim light along the hair and shoulders (r, g, b) and its strength. */
  rim: [number, number, number];
  rimStrength: number;
  /** Soft spot of light behind the head (from above for gold). */
  glow: [number, number, number];
  glowAlpha: number;
  seed: number;
}

const LOOKS: Record<Exclude<Backdrop, "original">, StudioLook> = {
  // The photographer's green: near-black forest green with patchy lighter smoke and a crisp green rim.
  green: { dark: [1, 10, 6], light: [30, 118, 64], gamma: 1.45, rim: [90, 255, 150], rimStrength: 1, glow: [30, 120, 65], glowAlpha: 0.1, seed: 11 },
  black: { dark: [4, 4, 5], light: [52, 56, 58], gamma: 1.8, rim: [215, 232, 245], rimStrength: 0.55, glow: [160, 170, 175], glowAlpha: 0.08, seed: 23 },
  gold: { dark: [5, 3, 1], light: [92, 64, 22], gamma: 1.7, rim: [255, 205, 120], rimStrength: 0.75, glow: [255, 200, 110], glowAlpha: 0.16, seed: 37 },
  // For the National card: smoky bronze and champagne under the card's gold metal, an ivory rim (no flag colours to clash with its tricolour band).
  champagne: { dark: [7, 6, 4], light: [78, 66, 44], gamma: 1.6, rim: [255, 240, 205], rimStrength: 0.7, glow: [235, 210, 160], glowAlpha: 0.12, seed: 41 },
  // For the State card: deep oxblood-maroon smoke under its saffron-to-red metal, a warm amber rim.
  ember: { dark: [7, 2, 1], light: [92, 30, 14], gamma: 1.6, rim: [255, 176, 96], rimStrength: 0.75, glow: [240, 120, 50], glowAlpha: 0.12, seed: 53 },
};

/** Fractal value noise (several octaves) — the look of photographic smoke. */
function smokeField(w: number, h: number, seed: number) {
  const rnd = seeded(seed);
  const out = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < 6; o++) {
    const cells = 3 * 2 ** o;
    const gw = cells + 2;
    const gh = Math.ceil((cells * h) / w) + 2;
    const grid = new Float32Array(gw * gh).map(() => rnd());
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * (gh - 2);
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * (gw - 2);
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const a = grid[y0 * gw + x0] + (grid[y0 * gw + x0 + 1] - grid[y0 * gw + x0]) * sx;
        const b = grid[(y0 + 1) * gw + x0] + (grid[(y0 + 1) * gw + x0 + 1] - grid[(y0 + 1) * gw + x0]) * sx;
        out[y * w + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

const backdropCache = new Map<string, HTMLCanvasElement>(); // v2

/** The studio backdrop: patchy smoke, brighter towards the sides and top, dark edges, light behind the head, grain. */
function studioBackdrop(W: number, H: number, look: StudioLook, gold: boolean) {
  const key = `${W}x${H}:${look.seed}`;
  const hit = backdropCache.get(key);
  if (hit) return hit;
  const sw = 240;
  const sh = Math.round((sw * H) / W);
  const n = smokeField(sw, sh, look.seed);
  const small = canvas(sw, sh);
  const sc = small.getContext("2d")!;
  const img = sc.createImageData(sw, sh);
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const u = x / sw - 0.5;
      const v = y / sh - 0.42;
      // Smoke shows more towards the sides (behind the shoulders) and fades into the corners.
      const side = Math.min(1, Math.abs(u) * 2.2) * 0.4 + 0.6;
      const vign = Math.max(0, 1 - (u * u * 1.3 + v * v * 0.9) * 1.6);
      let s = Math.max(0, (n[y * sw + x] - 0.28) / 0.48);
      s = Math.min(1, s) ** look.gamma * side * (0.25 + 0.75 * vign);
      const i = (y * sw + x) * 4;
      img.data[i] = look.dark[0] + (look.light[0] - look.dark[0]) * s;
      img.data[i + 1] = look.dark[1] + (look.light[1] - look.dark[1]) * s;
      img.data[i + 2] = look.dark[2] + (look.light[2] - look.dark[2]) * s;
      img.data[i + 3] = 255;
    }
  sc.putImageData(img, 0, 0);
  const out = canvas(W, H);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, W, H);
  // Light behind the head (a spotlight from above for gold).
  const ly = gold ? -H * 0.05 : H * 0.28;
  const l = ctx.createRadialGradient(W * 0.5, ly, 0, W * 0.5, ly, gold ? H * 0.75 : W * 0.5);
  l.addColorStop(0, `rgb(${look.glow.join(" ")} / ${look.glowAlpha})`);
  l.addColorStop(1, `rgb(${look.glow.join(" ")} / 0)`);
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  // A darker floor, so anything fading out at the bottom sinks into shadow.
  const floor = ctx.createLinearGradient(0, H * 0.7, 0, H);
  floor.addColorStop(0, "rgb(0 0 0 / 0)");
  floor.addColorStop(1, "rgb(0 0 0 / 0.75)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, H * 0.7, W, H * 0.3);
  // Fine grain, so it reads as a photograph.
  const grain = canvas(256, 256);
  const gc = grain.getContext("2d")!;
  const gi = gc.createImageData(256, 256);
  const r2 = seeded(look.seed + 99);
  for (let i = 0; i < gi.data.length; i += 4) {
    const v = 128 + (r2() - 0.5) * 50;
    gi.data[i] = gi.data[i + 1] = gi.data[i + 2] = v;
    gi.data[i + 3] = 22;
  }
  gc.putImageData(gi, 0, 0);
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grain, "repeat")!;
  ctx.fillRect(0, 0, W, H);
  backdropCache.set(key, out);
  return out;
}

/** A blurred copy of a canvas, made by scaling down and up (works in every browser). */
function softened(src: HTMLCanvasElement, factor: number) {
  const w = Math.max(1, Math.round(src.width / factor));
  const h = Math.max(1, Math.round(src.height / factor));
  const s = canvas(w, h);
  const sc = s.getContext("2d")!;
  sc.imageSmoothingQuality = "high";
  sc.drawImage(src, 0, 0, w, h);
  const out = canvas(src.width, src.height);
  const oc = out.getContext("2d")!;
  oc.imageSmoothingQuality = "high";
  oc.drawImage(s, 0, 0, src.width, src.height);
  return out;
}

/** Paints the card photo (960×1200). `adjust` nudges the automatic framing. */
export function compose(
  target: HTMLCanvasElement,
  cut: Cutout,
  backdrop: Backdrop,
  adjust: { zoom: number; x: number; y: number },
) {
  const { width: W, height: H } = FRAME;
  target.width = W;
  target.height = H;
  const ctx = target.getContext("2d")!;
  const f = cut.frame;
  const scale = f.scale * adjust.zoom;
  const dx = W / 2 - f.cx * scale + adjust.x * W;
  const dy = FRAME.headTop * H - f.top * scale + adjust.y * H;
  const dw = cut.photo.width * scale;
  const dh = cut.photo.height * scale;

  if (backdrop === "original") {
    ctx.fillStyle = "#0b0d0c";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cut.photo, dx, dy, dw, dh);
    return;
  }
  const look = LOOKS[backdrop];
  ctx.drawImage(studioBackdrop(W, H, look, backdrop === "gold"), 0, 0);

  // The matte at card size.
  const matte = canvas(W, H);
  const mc = matte.getContext("2d")!;
  mc.imageSmoothingQuality = "high";
  mc.drawImage(cut.matte, dx, dy, dw, dh);
  const fullMatte = canvas(W, H);
  fullMatte.getContext("2d")!.drawImage(matte, 0, 0);
  // If the photo ends above the bottom of the frame, fade the person out there (the backdrop carries on).
  const bottom = dy + dh;
  if (bottom < H + 1) {
    mc.globalCompositeOperation = "destination-out";
    const fade = mc.createLinearGradient(0, bottom - H * 0.14, 0, bottom);
    fade.addColorStop(0, "rgb(0 0 0 / 0)");
    fade.addColorStop(1, "rgb(0 0 0 / 1)");
    mc.fillStyle = fade;
    mc.fillRect(0, bottom - H * 0.14, W, H);
    mc.globalCompositeOperation = "source-over";
  }

  // The person on their own layer.
  const layer = canvas(W, H);
  const l = layer.getContext("2d")!;
  l.imageSmoothingQuality = "high";
  l.drawImage(cut.photo, dx, dy, dw, dh);
  l.globalCompositeOperation = "destination-in";
  l.drawImage(matte, 0, 0);

  // Grounding: a soft dark shadow behind the person.
  ctx.save();
  ctx.shadowColor = "rgb(0 0 0 / 0.55)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
  ctx.drawImage(layer, 0, 0);

  // Rim light: a thin bright band just inside the outline (matte minus a softened matte),
  // strongest on the hair and shoulders, tinted, then a faint glow just outside it.
  const inner = softened(fullMatte, 3);
  const rim = canvas(W, H);
  const rc = rim.getContext("2d")!;
  rc.drawImage(fullMatte, 0, 0);
  rc.globalCompositeOperation = "destination-out";
  rc.drawImage(inner, 0, 0);
  rc.globalCompositeOperation = "source-in";
  // Rim from the top of the head down to the shoulders, gone by mid-chest.
  const top = dy + f.top * scale;
  const tint = rc.createLinearGradient(0, top, 0, top + H * 0.55);
  tint.addColorStop(0, `rgb(${look.rim.join(" ")} / ${look.rimStrength})`);
  tint.addColorStop(0.55, `rgb(${look.rim.join(" ")} / ${look.rimStrength * 0.55})`);
  tint.addColorStop(1, `rgb(${look.rim.join(" ")} / 0)`);
  rc.fillStyle = tint;
  rc.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(rim, 0, 0);
  ctx.globalAlpha = 0.45;
  ctx.drawImage(softened(rim, 5), 0, 0); // a faint glow just around the edge
  ctx.restore();
}

export const toWebp = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Your browser could not save the image."))), "image/webp", 0.92));

/**
 * Just the person, on a transparent background, trimmed to them (a little
 * room above the head and at the sides). For cards where the person stands
 * on the card itself, like the officials' cards.
 */
export function cutoutImage(cut: Cutout): HTMLCanvasElement {
  const { photo, matte } = cut;
  const W = photo.width;
  const H = photo.height;
  // Find the person's outline on a small copy of the matte.
  const sw = 200;
  const sh = Math.max(1, Math.round((sw * H) / W));
  const small = canvas(sw, sh);
  const sc = small.getContext("2d")!;
  sc.drawImage(matte, 0, 0, sw, sh);
  const px = sc.getImageData(0, 0, sw, sh).data;
  let x0 = sw, y0 = sh, x1 = 0, y1 = 0;
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++)
      if (px[(y * sw + x) * 4] > 60) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0 || y1 <= y0) [x0, y0, x1, y1] = [0, 0, sw - 1, sh - 1];
  const k = W / sw;
  const pad = 0.04 * W;
  const cx = Math.max(0, x0 * k - pad);
  const cy = Math.max(0, y0 * k - pad);
  const cw = Math.min(W, (x1 + 1) * k + pad) - cx;
  const ch = Math.min(H, (y1 + 1) * k) - cy;

  const out = canvas(Math.round(cw), Math.round(ch));
  const o = out.getContext("2d")!;
  o.imageSmoothingQuality = "high";
  o.drawImage(photo, cx, cy, cw, ch, 0, 0, cw, ch);
  o.globalCompositeOperation = "destination-in";
  o.drawImage(matte, cx, cy, cw, ch, 0, 0, cw, ch);
  return out;
}
