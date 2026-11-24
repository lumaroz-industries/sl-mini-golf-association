import { SURFACES, type SurfaceKind, type SurfacePixels } from "./surfaces";

/**
 * Prepares the course surface textures in a background thread (Web Worker),
 * so the work happens while the 3D engine is still downloading instead of
 * blocking the first frame. Falls back to doing nothing: the engine then
 * makes any missing surface itself.
 */
const cache = new Map<string, SurfacePixels>();
let pending: Promise<void> | undefined;

const key = (kind: SurfaceKind, size: number) => `${kind}@${size}`;

export function prefetchSurfaces(size: number): Promise<void> {
  if (pending) return pending;
  pending = new Promise<void>((resolve) => {
    try {
      const worker = new Worker(new URL("./surfaces.worker.ts", import.meta.url), { type: "module" });
      const kinds = Object.keys(SURFACES) as SurfaceKind[];
      let left = kinds.length;
      const done = () => {
        worker.terminate();
        resolve();
      };
      worker.onmessage = (e: MessageEvent<{ kind: SurfaceKind; size: number; map: Uint8ClampedArray; bump: Uint8ClampedArray }>) => {
        cache.set(key(e.data.kind, e.data.size), { map: e.data.map, bump: e.data.bump });
        if (--left === 0) done();
      };
      worker.onerror = done;
      worker.postMessage({ kinds, size });
      // Never hold the page up for long.
      setTimeout(done, 8000);
    } catch {
      resolve();
    }
  });
  return pending;
}

/** The prepared pixels for a surface (handed over once), if they are ready. */
export function takeSurface(kind: SurfaceKind, size: number): SurfacePixels | undefined {
  const k = key(kind, size);
  const px = cache.get(k);
  cache.delete(k);
  return px;
}
