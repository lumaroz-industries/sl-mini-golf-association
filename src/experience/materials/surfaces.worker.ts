import { SURFACES, type SurfaceKind } from "./surfaces";

/** Background thread: draws the course surfaces and hands the pixels back (zero-copy). */
self.onmessage = (e: MessageEvent<{ kinds: SurfaceKind[]; size: number }>) => {
  const { kinds, size } = e.data;
  for (const kind of kinds) {
    const { map, bump } = SURFACES[kind](size);
    (self as unknown as Worker).postMessage({ kind, size, map, bump }, [map.buffer, bump.buffer]);
  }
};
