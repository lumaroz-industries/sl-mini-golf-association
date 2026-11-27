"use client";

/** Browser helpers for the admin: API calls, photo shrinking, live check. */

export interface ApiResult {
  ok: boolean;
  message?: string;
  issues?: string[];
  [k: string]: unknown;
}

/* Section locks: the lock password, once entered, is kept for this tab only
   and sent with every change (the server decides whether it is needed). */
const LOCK_KEY = "sl-admin-lock";

export function getLockPassword(): string | undefined {
  try {
    return sessionStorage.getItem(LOCK_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setLockPassword(pw: string | undefined) {
  try {
    if (pw) sessionStorage.setItem(LOCK_KEY, pw);
    else sessionStorage.removeItem(LOCK_KEY);
  } catch {}
}

export async function api(method: string, url: string, body?: unknown): Promise<ApiResult> {
  const lock = getLockPassword();
  if (lock && body && typeof body === "object" && !(body instanceof Blob) && !Array.isArray(body)) body = { ...(body as object), lockPassword: lock };
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body instanceof Blob ? { "Content-Type": body.type || "application/octet-stream" } : body ? { "Content-Type": "application/json" } : {}),
        ...(lock ? { "x-lock-password": lock } : {}),
      },
      body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    if (res.status === 401 && !url.startsWith("/api/admin/session")) {
      window.location.href = "/admin/login?expired=1";
    }
    return { ...data, ok: res.ok && data.ok !== false, message: data.message ?? (res.ok ? undefined : `Request failed (${res.status}).`) };
  } catch {
    return { ok: false, message: "No connection — check your internet and try again." };
  }
}

/**
 * Shrink a photo in the browser before uploading: turns it the right way up,
 * drops hidden metadata (including GPS location) and keeps the upload small.
 */
export async function shrinkImage(file: File, maxWidth: number): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`"${file.name}" can't be opened. Use a JPG, PNG or WebP photo (on iPhone, share it as "Most Compatible").`);
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  for (const q of [0.92, 0.85, 0.75]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size < 3.8 * 1024 * 1024) return blob;
  }
  throw new Error(`"${file.name}" is too large even after shrinking.`);
}

export async function uploadPhoto(collection: "updates" | "articles" | "gallery" | "players" | "officials", slug: string, file: File, name: string, maxWidth: number) {
  const blob = await shrinkImage(file, maxWidth);
  const q = new URLSearchParams({ collection, slug, name });
  return api("POST", `/api/admin/upload?${q}`, blob);
}

/** Waits until the live site was rebuilt from `commit` (Vercel). Resolves false after ~6 minutes. */
export async function waitUntilLive(commit: string, onTick?: (seconds: number) => void): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < 6 * 60_000) {
    await new Promise((r) => setTimeout(r, 8000));
    onTick?.(Math.round((Date.now() - start) / 1000));
    const r = await api("GET", "/api/admin/status");
    if (r.ok && typeof r.commit === "string" && r.commit === commit) return true;
    if (r.ok && r.commit === null) return false; // not on Vercel (local preview)
  }
  return false;
}

export const todayInIndia = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
