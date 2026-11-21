import { Vector3 } from "three";

/**
 * The course centreline — one continuous path from the tee to the cup.
 * Units are metres. Every track piece, the ball and the camera are placed
 * relative to this path, which guarantees physical continuity.
 */

export type SegmentId = "tee" | "ramp" | "deck" | "tunnel" | "curves" | "bridge" | "obstacles" | "final" | "green";

export const SEGMENTS: SegmentId[] = ["tee", "ramp", "deck", "tunnel", "curves", "bridge", "obstacles", "final", "green"];

export const FLOOR_Y = -0.25;
export const BALL_RADIUS = 0.02135; // 42.7 mm mini-golf ball
export const CUP_RADIUS = 0.054; // 108 mm cup

/** Track (playing surface) width per segment, rails excluded. */
const SEGMENT_WIDTH: Record<SegmentId, number> = {
  tee: 1.5,
  ramp: 0.85,
  deck: 0.85,
  tunnel: 0.85,
  curves: 0.9,
  bridge: 0.85,
  obstacles: 1.1,
  final: 1.0,
  green: 1.0,
};

const STEP = 0.05;
const UP = new Vector3(0, 1, 0);
const deg = (d: number) => (d * Math.PI) / 180;
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Heading 0 faces −Z; positive headings turn right (towards +X). */
function headingDir(h: number) {
  return new Vector3(Math.sin(h), 0, -Math.cos(h));
}

class Turtle {
  pts: Vector3[] = [new Vector3()];
  segs: SegmentId[] = ["tee"];
  banks: number[] = [0];
  private p = new Vector3();
  private h = 0;

  straight(seg: SegmentId, len: number, rise = 0) {
    const n = Math.max(2, Math.ceil(len / STEP));
    const d = headingDir(this.h);
    const y0 = this.p.y;
    for (let i = 1; i <= n; i++) {
      this.p.x += (d.x * len) / n;
      this.p.z += (d.z * len) / n;
      this.p.y = y0 + rise * smoother(i / n);
      this.push(seg, 0);
    }
  }

  /** Signed angle: positive turns right. Bank tilts the surface into the turn. */
  arc(seg: SegmentId, radius: number, angle: number, rise = 0, bank = 0) {
    const len = radius * Math.abs(angle);
    const n = Math.max(2, Math.ceil(len / STEP));
    const h0 = this.h;
    const y0 = this.p.y;
    for (let i = 1; i <= n; i++) {
      const d = headingDir(h0 + (angle * (i - 0.5)) / n);
      this.p.x += (d.x * len) / n;
      this.p.z += (d.z * len) / n;
      this.p.y = y0 + rise * smoother(i / n);
      this.h = h0 + (angle * i) / n;
      this.push(seg, Math.sign(angle) * bank * Math.sin(Math.PI * (i / n)));
    }
  }

  private push(seg: SegmentId, bank: number) {
    this.pts.push(this.p.clone());
    this.segs.push(seg);
    this.banks.push(bank);
  }
}

export interface Frame {
  pos: Vector3;
  T: Vector3;
  R: Vector3;
  U: Vector3;
  width: number;
}

export class CoursePath {
  readonly n: number;
  readonly s: Float32Array;
  readonly pos: Vector3[];
  readonly T: Vector3[] = [];
  readonly R: Vector3[] = [];
  readonly U: Vector3[] = [];
  readonly width: Float32Array;
  readonly seg: SegmentId[];
  readonly length: number;
  readonly segStart = {} as Record<SegmentId, number>;
  readonly segEnd = {} as Record<SegmentId, number>;
  readonly segStartIndex = {} as Record<SegmentId, number>;
  readonly segEndIndex = {} as Record<SegmentId, number>;

  constructor(t: Turtle) {
    this.pos = t.pts;
    this.seg = t.segs;
    this.n = t.pts.length;
    this.s = new Float32Array(this.n);
    for (let i = 1; i < this.n; i++) this.s[i] = this.s[i - 1] + t.pts[i].distanceTo(t.pts[i - 1]);
    this.length = this.s[this.n - 1];

    for (let i = 0; i < this.n; i++) {
      const a = this.pos[Math.max(0, i - 1)];
      const b = this.pos[Math.min(this.n - 1, i + 1)];
      const T = b.clone().sub(a).normalize();
      const R = new Vector3().crossVectors(T, UP).normalize();
      const U = new Vector3().crossVectors(R, T).normalize();
      const bank = t.banks[i];
      // Positive bank lowers the right edge.
      const R2 = R.clone().multiplyScalar(Math.cos(bank)).addScaledVector(U, -Math.sin(bank));
      const U2 = U.clone().multiplyScalar(Math.cos(bank)).addScaledVector(R, Math.sin(bank));
      this.T.push(T);
      this.R.push(R2);
      this.U.push(U2);
    }

    // Segment extents.
    for (let i = 0; i < this.n; i++) {
      const id = this.seg[i];
      if (this.segStartIndex[id] === undefined) {
        // The first sample of a segment is shared with the previous one's end.
        const start = Math.max(0, i - 1);
        this.segStartIndex[id] = start;
        this.segStart[id] = this.s[start];
      }
      this.segEndIndex[id] = i;
      this.segEnd[id] = this.s[i];
    }

    // Width, smoothed over ±0.6 m so transitions between segments are gradual.
    const raw = this.seg.map((id) => SEGMENT_WIDTH[id]);
    this.width = new Float32Array(this.n);
    const win = Math.round(0.6 / STEP);
    for (let i = 0; i < this.n; i++) {
      let sum = 0;
      let count = 0;
      for (let k = i - win; k <= i + win; k++) {
        const j = Math.min(this.n - 1, Math.max(0, k));
        sum += raw[j];
        count++;
      }
      this.width[i] = sum / count;
    }
  }

  /** Index i such that s[i] ≤ s < s[i+1]. */
  private locate(s: number): [number, number] {
    if (s <= 0) return [0, 0];
    if (s >= this.length) return [this.n - 2, 1];
    let lo = 0;
    let hi = this.n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.s[mid] <= s) lo = mid;
      else hi = mid;
    }
    return [lo, (s - this.s[lo]) / (this.s[lo + 1] - this.s[lo])];
  }

  /** Frame at arc length s. Beyond either end the path is extended straight. */
  frameAt(s: number, out?: Frame): Frame {
    const f = out ?? { pos: new Vector3(), T: new Vector3(), R: new Vector3(), U: new Vector3(), width: 0 };
    if (s < 0 || s > this.length) {
      const i = s < 0 ? 0 : this.n - 1;
      const over = s < 0 ? s : s - this.length;
      f.T.copy(this.T[i]);
      f.R.copy(this.R[i]);
      f.U.copy(this.U[i]);
      f.pos.copy(this.pos[i]).addScaledVector(this.T[i], over);
      f.width = this.width[i];
      return f;
    }
    const [i, k] = this.locate(s);
    const j = Math.min(this.n - 1, i + 1);
    f.pos.lerpVectors(this.pos[i], this.pos[j], k);
    f.T.lerpVectors(this.T[i], this.T[j], k).normalize();
    f.R.lerpVectors(this.R[i], this.R[j], k).normalize();
    f.U.lerpVectors(this.U[i], this.U[j], k).normalize();
    f.width = this.width[i] + (this.width[j] - this.width[i]) * k;
    return f;
  }

  segmentAt(s: number): SegmentId {
    return this.seg[this.locate(s)[0] + 1] ?? "green";
  }
}

/** The one course. Elevations: tee 0 m → ramp top 2.0 m → green 0.4 m. */
export function buildCoursePath(): CoursePath {
  const t = new Turtle();
  t.straight("tee", 4.5);
  t.straight("ramp", 7, 2.0);
  t.straight("deck", 3);
  t.arc("tunnel", 9, deg(40), -0.35);
  t.arc("curves", 4.5, deg(-95), -0.6, 0.1);
  t.arc("curves", 4.5, deg(85), -0.4, 0.1);
  t.straight("bridge", 6);
  t.straight("obstacles", 10);
  t.arc("final", 7, deg(-30), -0.25);
  t.straight("green", 4.2);
  return new CoursePath(t);
}

/* ------------------------------------------------------------------ layout */

/** Ball start on the tee. */
export const TEE_BALL_S = 0.9;

/** Obstacle placement, as local distances from the obstacles segment start. */
export const OBSTACLES = {
  gate: 3.0,
  bounce: 5.0,
  arch: 7.0,
  posts: [
    { at: 6.0, offset: -0.3 },
    { at: 8.5, offset: 0.33 },
  ],
};

/** Cup on the green: distance from green start, and lateral offset. */
export const CUP = { at: 3.3, offset: 0.22 };

/** Green surface outline in green-local coordinates (x across, y along). */
export const GREEN_SHAPE = { halfWidth: 1.3, start: 0, end: 4.6, radius: 0.6 };
