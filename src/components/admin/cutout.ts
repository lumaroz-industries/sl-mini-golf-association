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

export type Backdrop = "studio" | "emerald" | "original";

export const BACKDROPS: Array<{ id: Backdrop; label: string }> = [
  { id: "studio", label: "Studio dark" },
  { id: "emerald", label: "Emerald" },
  { id: "original", label: "Keep original" },
];

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

  // Backdrop: a soft studio light behind the head, falling off to near-black.
  const g = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H * 0.85);
  if (backdrop === "studio") {
    g.addColorStop(0, "#2b3431");
    g.addColorStop(0.45, "#141917");
    g.addColorStop(1, "#050807");
  } else {
    g.addColorStop(0, "#0f5a40");
    g.addColorStop(0.45, "#063223");
    g.addColorStop(1, "#03130d");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // The person: photo masked by the matte, drawn on its own layer.
  const layer = canvas(W, H);
  const l = layer.getContext("2d")!;
  l.imageSmoothingQuality = "high";
  l.drawImage(cut.photo, dx, dy, dw, dh);
  l.globalCompositeOperation = "destination-in";
  l.drawImage(cut.matte, dx, dy, dw, dh);

  // Soft shadow so the person sits in the scene rather than on top of it.
  ctx.shadowColor = "rgb(0 0 0 / 0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();

  // If the photo ends above the bottom of the frame, fade that edge away.
  const bottom = dy + dh;
  if (bottom < H) {
    const fade = ctx.createLinearGradient(0, bottom - H * 0.12, 0, bottom);
    fade.addColorStop(0, "rgb(5 8 7 / 0)");
    fade.addColorStop(1, "rgb(5 8 7 / 1)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, bottom - H * 0.12, W, H * 0.12);
    ctx.fillStyle = "#050807";
    ctx.fillRect(0, bottom, W, H - bottom);
  }
}

export const toWebp = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Your browser could not save the image."))), "image/webp", 0.92));
