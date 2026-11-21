import { Quaternion, Vector3 } from "three";
import { BALL_RADIUS, CUP, CoursePath, OBSTACLES, TEE_BALL_S, type Frame } from "../course/path";
import { P, P_IMPACT, smoothstep } from "./chapters";

/**
 * Baked ball motion.
 *
 * A live physics engine cannot be scrubbed backwards exactly, so the shot is
 * simulated once: speed follows energy conservation (gravity on slopes,
 * rolling friction, energy lost at the rail bounce, extra friction on the
 * green). Scroll progress is then mapped onto that simulated time, so the
 * ball accelerates downhill, slows on ramps, and reverses perfectly.
 */

const G = 9.81;
const MU = 0.025;
const MU_GREEN = 0.12;
const BOUNCE_ENERGY = 0.6; // fraction of v² kept at the rail impact
const V_MIN = 0.35;
const V_CUP = 0.42;
const DS = 0.01;

export interface BallState {
  s: number;
  position: Vector3;
  quaternion: Quaternion;
  /** 0 on the surface, 1 resting at the bottom of the cup. */
  drop: number;
}

/** Journey chapters: scroll range → path range the ball covers. */
interface Leg {
  p0: number;
  p1: number;
  s0: number;
  s1: number;
}

export class BallMotion {
  readonly sStart: number;
  readonly sCup: number;
  readonly sBounce: number;
  readonly sGate: number;
  readonly sArch: number;
  readonly cupPosition = new Vector3();
  private readonly samples: number;
  private readonly time: Float32Array;
  private readonly quats: Quaternion[] = [];
  private readonly legs: Leg[];
  private readonly f: Frame = { pos: new Vector3(), T: new Vector3(), R: new Vector3(), U: new Vector3(), width: 0 };

  constructor(private readonly path: CoursePath) {
    const seg = path.segStart;
    this.sStart = TEE_BALL_S;
    this.sCup = seg.green + CUP.at;
    this.sBounce = seg.obstacles + OBSTACLES.bounce;
    this.sGate = seg.obstacles + OBSTACLES.gate;
    this.sArch = seg.obstacles + OBSTACLES.arch;
    this.surfacePoint(this.sCup, this.cupPosition);

    // ---- simulate speed along the path, integrate time and rolling rotation
    this.samples = Math.ceil((this.sCup - this.sStart) / DS) + 1;
    this.time = new Float32Array(this.samples);
    const rampTop = seg.deck;
    const h = (s: number) => this.surfacePoint(s, new Vector3()).y;
    const h0 = h(this.sStart);
    // Launch speed: just enough energy to crest the ramp at ~0.9 m/s.
    let e = 0.9 ** 2 + 2 * G * (h(rampTop) - h0) + 2 * MU * G * (rampTop - this.sStart);

    const prev = this.ballCenter(this.sStart, new Vector3());
    const cur = new Vector3();
    const axis = new Vector3();
    const q = new Quaternion();
    const dq = new Quaternion();
    this.quats.push(q.clone());
    let vPrev = Math.sqrt(e);
    let hPrev = h0;

    for (let i = 1; i < this.samples; i++) {
      const s = Math.min(this.sCup, this.sStart + i * DS);
      const sPrev = this.sStart + (i - 1) * DS;
      const hs = h(s);
      const mu = s > seg.green ? MU_GREEN : MU;
      e -= 2 * G * (hs - hPrev) + 2 * mu * G * DS;
      if (sPrev < this.sBounce && s >= this.sBounce) e *= BOUNCE_ENERGY;
      hPrev = hs;
      let v = Math.sqrt(Math.max(V_MIN * V_MIN, e));
      // Final 2.5 m: blend into a gentle approach so the ball drops, not lips out.
      const k = smoothstep(this.sCup - 2.5, this.sCup, s);
      v = v * (1 - k) + (V_CUP + 0.9 * (1 - k)) * k;
      this.time[i] = this.time[i - 1] + (2 * DS) / (v + vPrev);
      vPrev = v;

      // Rolling without slipping: axis = n × direction, angle = distance / r.
      this.ballCenter(s, cur);
      const d = cur.clone().sub(prev);
      const dist = d.length();
      if (dist > 1e-6) {
        this.path.frameAt(s, this.f);
        axis.crossVectors(this.f.U, d).normalize();
        dq.setFromAxisAngle(axis, dist / BALL_RADIUS);
        q.premultiply(dq);
      }
      this.quats.push(q.clone());
      prev.copy(cur);
    }

    this.legs = [
      { p0: P_IMPACT, p1: P.rampEnd, s0: this.sStart, s1: seg.deck },
      { p0: P.rampEnd, p1: P.deckEnd, s0: seg.deck, s1: seg.tunnel },
      { p0: P.deckEnd, p1: P.tunnelEnd, s0: seg.tunnel, s1: seg.curves },
      { p0: P.tunnelEnd, p1: P.curvesEnd, s0: seg.curves, s1: seg.bridge },
      { p0: P.curvesEnd, p1: P.bridgeEnd, s0: seg.bridge, s1: seg.obstacles },
      { p0: P.bridgeEnd, p1: P.obstaclesEnd, s0: seg.obstacles, s1: seg.final },
      { p0: P.obstaclesEnd, p1: P.greenEnd, s0: seg.final, s1: this.sCup },
    ];
  }

  /** Lateral offset of the ball line from the track centreline. */
  offsetAt(s: number): number {
    const seg = this.path.segStart;
    const halfInner = 0.55 - BALL_RADIUS; // obstacles track half-width minus ball radius
    const xb = s - seg.bridge;
    const bounceX = this.sBounce - seg.bridge;
    const endX = seg.final - seg.bridge;
    const exitOffset = -0.15;
    if (xb >= 0 && xb <= bounceX) return (halfInner * xb) / bounceX; // straight line into the rail
    if (xb > bounceX && xb <= endX) return halfInner + ((exitOffset - halfInner) * (xb - bounceX)) / (endX - bounceX);
    if (s > seg.final && s <= seg.green) {
      // Hermite: leave the bank shot line, settle on the centre of the final curve.
      const u = (s - seg.final) / (seg.green - seg.final);
      const m0 = ((exitOffset - halfInner) / (endX - bounceX)) * (seg.green - seg.final);
      return hermite(exitOffset, m0, 0, 0, u);
    }
    if (s > seg.green) {
      // Gentle break across the green into the cup.
      const u = Math.min(1, (s - seg.green) / CUP.at);
      return hermite(0, 0, CUP.offset, 0.08, u);
    }
    return 0;
  }

  /** Point on the playing surface under the ball line. */
  surfacePoint(s: number, out: Vector3): Vector3 {
    this.path.frameAt(s, this.f);
    return out.copy(this.f.pos).addScaledVector(this.f.R, this.offsetAt(s));
  }

  ballCenter(s: number, out: Vector3): Vector3 {
    this.path.frameAt(s, this.f);
    return out.copy(this.f.pos).addScaledVector(this.f.R, this.offsetAt(s)).addScaledVector(this.f.U, BALL_RADIUS);
  }

  /** Simulated time at s (seconds since impact). */
  private timeAt(s: number): number {
    const x = Math.min(this.samples - 1, Math.max(0, (s - this.sStart) / DS));
    const i = Math.floor(x);
    const j = Math.min(this.samples - 1, i + 1);
    return this.time[i] + (this.time[j] - this.time[i]) * (x - i);
  }

  private sAtTime(t: number): number {
    let lo = 0;
    let hi = this.samples - 1;
    if (t <= 0) return this.sStart;
    if (t >= this.time[hi]) return this.sCup;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.time[mid] <= t) lo = mid;
      else hi = mid;
    }
    const k = (t - this.time[lo]) / (this.time[hi] - this.time[lo]);
    return this.sStart + (lo + k) * DS;
  }

  /** Ball distance along the path for scroll progress p. */
  sAt(p: number): number {
    if (p <= P_IMPACT) return this.sStart;
    for (const leg of this.legs) {
      if (p <= leg.p1) {
        const u = (p - leg.p0) / (leg.p1 - leg.p0);
        const t0 = this.timeAt(leg.s0);
        const t1 = this.timeAt(leg.s1);
        return this.sAtTime(t0 + u * (t1 - t0));
      }
    }
    return this.sCup;
  }

  /** Scroll progress at which the ball reaches s (inverse of sAt). */
  pAt(s: number): number {
    for (const leg of this.legs) {
      if (s <= leg.s1) {
        const t0 = this.timeAt(leg.s0);
        const t1 = this.timeAt(leg.s1);
        return leg.p0 + ((this.timeAt(s) - t0) / (t1 - t0)) * (leg.p1 - leg.p0);
      }
    }
    return P.greenEnd;
  }

  private quatAt(s: number, out: Quaternion): Quaternion {
    const x = Math.min(this.quats.length - 1, Math.max(0, (s - this.sStart) / DS));
    const i = Math.floor(x);
    const j = Math.min(this.quats.length - 1, i + 1);
    return out.copy(this.quats[i]).slerp(this.quats[j], x - i);
  }

  stateAt(p: number, out: BallState): BallState {
    const s = this.sAt(p);
    out.s = s;
    this.ballCenter(s, out.position);
    this.quatAt(s, out.quaternion);
    // Drop into the cup: roll a touch further while falling under gravity.
    const u = smoothstep(P.greenEnd, P.dropEnd, p);
    out.drop = u;
    if (u > 0) {
      const f = this.path.frameAt(this.sCup, this.f);
      const fall = u * u; // accelerating
      out.position.addScaledVector(f.T, 0.022 * Math.sin((u * Math.PI) / 2));
      out.position.y -= fall * 0.072;
      const extra = new Quaternion().setFromAxisAngle(f.R, -u * 1.4);
      out.quaternion.premultiply(extra);
    }
    return out;
  }
}

function hermite(p0: number, m0: number, p1: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}
