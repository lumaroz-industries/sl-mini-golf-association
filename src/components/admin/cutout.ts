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

export type Backdrop = "green" | "black" | "gold" | "original";

export const BACKDROPS: Array<{ id: Backdrop; label: string }> = [
  { id: "green", label: "Green studio" },
  { id: "black", label: "Black studio" },
  { id: "gold", label: "Gold spotlight" },
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
  base: [string, string, string]; // centre, middle, edge
  smoke: string; // rgb triplet of the smoke
  smokeAlpha: number;
  light: string; // rgb triplet of the light behind the head
  lightAlpha: number;
  rim: string; // rim-light colour around the person
  rimBlur: number;
}

const LOOKS: Record<Exclude<Backdrop, "original">, StudioLook> = {
  // Deep forest-green photo-studio backdrop with drifting smoke and a green rim light.
  green: { base: ["#05301b", "#021a0e", "#000502"], smoke: "30 125 68", smokeAlpha: 0.34, light: "40 150 85", lightAlpha: 0.08, rim: "rgb(60 210 115 / 0.45)", rimBlur: 22 },
  // Classic black studio with a soft grey light and a cool white rim.
  black: { base: ["#26292a", "#111314", "#030303"], smoke: "150 160 165", smokeAlpha: 0.06, light: "200 210 215", lightAlpha: 0.12, rim: "rgb(220 235 245 / 0.35)", rimBlur: 28 },
  // Black with a warm golden spotlight from above and a gold rim.
  gold: { base: ["#3a2a10", "#160f05", "#030201"], smoke: "220 170 80", smokeAlpha: 0.09, light: "255 200 110", lightAlpha: 0.22, rim: "rgb(255 205 120 / 0.5)", rimBlur: 30 },
};

/** Paints a studio backdrop: base light, drifting smoke, the light behind the head and a vignette. */
function paintStudio(ctx: CanvasRenderingContext2D, W: number, H: number, look: StudioLook, gold: boolean) {
  // Base: brightest behind the subject, falling off to the edges.
  const g = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.45, H * 0.85);
  g.addColorStop(0, look.base[0]);
  g.addColorStop(0.45, look.base[1]);
  g.addColorStop(1, look.base[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Smoke: many soft blobs on a small canvas, scaled up so they melt into clouds.
  // Heavier on the right and lower left, like a photographer's smoke backdrop.
  const sw = 160;
  const sh = 200;
  const smoke = canvas(sw, sh);
  const s = smoke.getContext("2d")!;
  const rnd = seeded(gold ? 7 : 42);
  for (let i = 0; i < 110; i++) {
    const big = i < 36;
    const side = rnd() < 0.55 ? 0.62 + rnd() * 0.45 : rnd() * 0.45;
    const x = (big ? side : rnd()) * sw;
    const y = (0.1 + rnd() * 0.9) * sh;
    const r = big ? 16 + rnd() * 38 : 4 + rnd() * 10; // clouds, then mottling
    const a = look.smokeAlpha * (big ? 0.15 + rnd() ** 2 * 0.85 : 0.1 + rnd() * 0.35);
    const b = s.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgb(${look.smoke} / ${a})`);
    b.addColorStop(1, `rgb(${look.smoke} / 0)`);
    s.fillStyle = b;
    s.fillRect(0, 0, sw, sh);
  }
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(smoke, 0, 0, W, H);
  ctx.restore();

  // The light behind the head (a spotlight from above for gold).
  const ly = gold ? -H * 0.05 : H * 0.3;
  const l = ctx.createRadialGradient(W * 0.5, ly, 0, W * 0.5, ly, gold ? H * 0.75 : W * 0.55);
  l.addColorStop(0, `rgb(${look.light} / ${look.lightAlpha})`);
  l.addColorStop(1, `rgb(${look.light} / 0)`);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Vignette: darker corners and edges.
  const v = ctx.createRadialGradient(W * 0.5, H * 0.45, H * 0.3, W * 0.5, H * 0.45, H * 0.82);
  v.addColorStop(0, "rgb(0 0 0 / 0)");
  v.addColorStop(0.55, "rgb(0 0 0 / 0.25)");
  v.addColorStop(1, "rgb(0 0 0 / 0.78)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // Fine grain, so the backdrop reads as a photograph rather than a gradient.
  const grain = canvas(256, 256);
  const gc = grain.getContext("2d")!;
  const img = gc.createImageData(256, 256);
  const r2 = seeded(9);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + (r2() - 0.5) * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    img.data[i + 3] = 18;
  }
  gc.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grain, "repeat")!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
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

  ctx.save();
  if (backdrop === "original") {
    ctx.fillStyle = "#0b0d0c";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cut.photo, dx, dy, dw, dh);
    ctx.restore();
    return;
  }
  const look = LOOKS[backdrop];
  paintStudio(ctx, W, H, look, backdrop === "gold");

  // The person: photo masked by the matte, drawn on its own layer.
  const layer = canvas(W, H);
  const l = layer.getContext("2d")!;
  l.imageSmoothingQuality = "high";
  l.drawImage(cut.photo, dx, dy, dw, dh);
  l.globalCompositeOperation = "destination-in";
  l.drawImage(cut.matte, dx, dy, dw, dh);

  // Rim light: a coloured glow around the hair and shoulders (drawn behind the person)…
  ctx.shadowColor = look.rim;
  ctx.shadowBlur = look.rimBlur;
  ctx.drawImage(layer, 0, 0);
  // …and a soft grounding shadow, then the person on top.
  ctx.shadowColor = "rgb(0 0 0 / 0.5)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();

  // If the photo ends above the bottom of the frame, fade that edge away.
  const bottom = dy + dh;
  if (bottom < H) {
    const fade = ctx.createLinearGradient(0, bottom - H * 0.12, 0, bottom);
    fade.addColorStop(0, "rgb(3 5 4 / 0)");
    fade.addColorStop(1, "rgb(3 5 4 / 1)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, bottom - H * 0.12, W, H * 0.12);
    ctx.fillStyle = "#030504";
    ctx.fillRect(0, bottom, W, H - bottom);
  }
}

export const toWebp = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Your browser could not save the image."))), "image/webp", 0.92));
