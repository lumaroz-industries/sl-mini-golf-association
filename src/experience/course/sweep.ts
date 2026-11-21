import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

/**
 * Sweeps a 2D profile along a sequence of frames.
 *
 * Profile points are (a, b) in each frame's (R, U) plane. Traverse a closed
 * profile clockwise (R to the right, U up) for outward-facing normals; open
 * profiles traversed left→right face +U.
 */
export interface SweepFrame {
  pos: Vector3;
  R: Vector3;
  U: Vector3;
  s: number;
}

export type Profile = Array<[number, number]>;

export interface SweepOptions {
  /** Texture metres per UV unit along the sweep. */
  uScale?: number;
  /** Texture metres per UV unit across the profile. */
  vScale?: number;
  /** Adds an `aS` attribute with the arc length (for reveal shaders). */
  withArcLength?: boolean;
}

export function sweep(frames: SweepFrame[], profile: (i: number) => Profile, opts: SweepOptions = {}): BufferGeometry {
  const uScale = opts.uScale ?? 1;
  const vScale = opts.vScale ?? 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const arc: number[] = [];
  const indices: number[] = [];
  let cols = -1;
  const v = new Vector3();

  frames.forEach((f, i) => {
    const prof = profile(i);
    if (cols === -1) cols = prof.length;
    let acc = 0;
    prof.forEach(([a, b], j) => {
      if (j > 0) acc += Math.hypot(a - prof[j - 1][0], b - prof[j - 1][1]);
      v.copy(f.pos).addScaledVector(f.R, a).addScaledVector(f.U, b);
      positions.push(v.x, v.y, v.z);
      uvs.push(f.s / uScale, acc / vScale);
      arc.push(f.s);
    });
  });

  for (let i = 0; i < frames.length - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  if (opts.withArcLength) g.setAttribute("aS", new Float32BufferAttribute(arc, 1));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Closed rectangle profile (clockwise) with duplicated corners for crisp edges. */
export function rectProfile(a0: number, a1: number, b0: number, b1: number): Profile {
  return [
    [a0, b0],
    [a0, b1],
    [a0, b1],
    [a1, b1],
    [a1, b1],
    [a1, b0],
    [a1, b0],
    [a0, b0],
  ];
}

/** Arch (half circle) from the right side over the top to the left side. */
export function archProfile(radius: number, segments: number, inward = true, b0 = 0): Profile {
  const pts: Profile = [];
  for (let k = 0; k <= segments; k++) {
    const t = (k / segments) * Math.PI;
    pts.push([Math.cos(t) * radius, b0 + Math.sin(t) * radius]);
  }
  return inward ? pts : pts.reverse();
}
