import { Vector3 } from "three";
import { OBSTACLES, type CoursePath, type Frame } from "../course/path";
import type { World } from "../course/buildWorld";
import type { BallMotion, BallState } from "../timeline/ballMotion";
import { P, smoothstep } from "../timeline/chapters";

/**
 * Camera shot list. Each shot maps scroll progress to a camera position,
 * look-at target and field of view. Neighbouring shots are blended over a
 * short window so cuts are smooth, and everything is a pure function of
 * progress — scrolling back reverses every move exactly.
 */

export interface CameraPose {
  pos: Vector3;
  look: Vector3;
  fov: number;
}

interface ShotContext {
  path: CoursePath;
  motion: BallMotion;
  world: World;
  ball: BallState;
  /** >1 on portrait screens: pulls the camera back a little. */
  reach: number;
}

interface Shot {
  from: number;
  to: number;
  pose(p: number, u: number, c: ShotContext): CameraPose;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);

function frame(c: ShotContext, s: number): Frame {
  return c.path.frameAt(s);
}

/** Point on/near the course at s with offsets in that frame. */
function at(c: ShotContext, s: number, r = 0, up = 0, t = 0): Vector3 {
  const f = frame(c, s);
  return f.pos.clone().addScaledVector(f.R, r).addScaledVector(f.U, up).addScaledVector(f.T, t);
}

/** Offset around the tee ball: φ = 0 in front of the ball, π/2 to its right, π behind it. */
function orbit(c: ShotContext, center: Vector3, phi: number, dist: number, h: number): Vector3 {
  const f = frame(c, c.motion.sStart);
  return center
    .clone()
    .addScaledVector(f.T, Math.cos(phi) * dist)
    .addScaledVector(f.R, Math.sin(phi) * dist)
    .addScaledVector(f.U, h);
}

export function createShots(path: CoursePath, motion: BallMotion, world: World) {
  const tee = motion.ballCenter(motion.sStart, new Vector3());
  const teeFrame = path.frameAt(motion.sStart);
  const cup = motion.cupPosition.clone();
  const { T: Tg, R: Rg } = world.greenFrame;
  const pBounce = motion.pAt(motion.sBounce);
  const pArch = motion.pAt(motion.sArch + 0.9);
  const sPostArch = path.segStart.obstacles + OBSTACLES.arch + 2.2;
  const center = world.bounds.center;
  const size = world.bounds.size;

  const shots: Shot[] = [
    {
      // A — reveal: from high in the dark down to the ball, the wall typography behind it.
      from: 0,
      to: P.revealEnd,
      pose: (_p, u, c) => {
        const e = ease(u);
        const k = c.reach - 1; // portrait: stand further back so the wall typography fits
        return {
          pos: tee.clone().add(v(lerp(2.4, 0.55, e), lerp(1.9, 0.32 + 0.4 * k, e), lerp(-4.2 - 4 * k, -1.5 - 6 * k, e))),
          look: tee.clone().add(v(0, lerp(1.1, 0.62, e), lerp(3.0, 2.0, e))),
          fov: lerp(46, 38, e),
        };
      },
    },
    {
      // B — brand: slow, steady push towards the ball.
      from: P.revealEnd,
      to: P.brandEnd,
      pose: (_p, u, c) => {
        const e = ease(u);
        const k = c.reach - 1;
        return {
          pos: tee.clone().add(v(lerp(0.55, 0.16, e), lerp(0.32 + 0.4 * k, 0.05, e), lerp(-1.5 - 6 * k, -0.4 - 0.5 * k, e))),
          look: tee.clone().add(v(0, lerp(0.62, 0.03, e), lerp(2.0, 0.25, e))),
          fov: 38,
        };
      },
    },
    {
      // C — swing: orbit to an extreme side close-up, impact, then swing behind the rolling ball.
      from: P.brandEnd,
      to: P.swingEnd,
      pose: (_p, u, c) => {
        const ballPos = c.ball.position;
        if (u < 0.3) {
          const e = ease(u / 0.3);
          const phi = lerp(-0.37, -Math.PI / 2 + 0.12, e);
          return {
            pos: orbit(c, tee, phi, lerp(0.43, 0.3, e) * c.reach, lerp(0.05, 0.035, e)),
            look: tee.clone().addScaledVector(teeFrame.T, lerp(-0.25, -0.02, e)).addScaledVector(teeFrame.U, 0.02),
            fov: lerp(38, 34, e),
          };
        }
        if (u < 0.82) {
          const e = (u - 0.3) / 0.52;
          return {
            pos: orbit(c, tee, -Math.PI / 2 + 0.12 - e * 0.1, lerp(0.3, 0.22, e) * c.reach * c.reach, lerp(0.035, 0.026, e)),
            look: tee.clone().addScaledVector(teeFrame.T, -0.025).addScaledVector(teeFrame.U, 0.012),
            fov: lerp(34, 30, e),
          };
        }
        const e = ease((u - 0.82) / 0.18);
        return {
          pos: orbit(c, ballPos, lerp(-Math.PI / 2 + 0.02, -Math.PI + 0.25, e), lerp(0.22, 0.5, e), lerp(0.026, 0.07, e)),
          look: ballPos.clone().addScaledVector(teeFrame.T, lerp(0, 0.5, e)),
          fov: lerp(30, 40, e),
        };
      },
    },
    {
      // D — ramp: low-angle tracking from behind.
      from: P.swingEnd,
      to: P.rampEnd,
      pose: (_p, u, c) => ({
        pos: at(c, c.ball.s - 0.55 * c.reach, 0.15, 0.04 + 0.05 * u),
        look: at(c, c.ball.s + 0.6, c.motion.offsetAt(c.ball.s) * 0.5, 0.06),
        fov: 42,
      }),
    },
    {
      // E — elevated deck: a higher, wider chase while the introduction is read.
      from: P.rampEnd,
      to: P.deckEnd,
      pose: (_p, u, c) => ({
        pos: at(c, c.ball.s - 1.3 * c.reach, lerp(0.55, 0.2, u), lerp(0.65, 0.35, u)),
        look: at(c, c.ball.s + 0.9, 0, 0.1),
        fov: 44,
      }),
    },
    {
      // F — tunnel: camera leads the ball, looking back at it.
      from: P.deckEnd,
      to: P.tunnelEnd,
      pose: (_p, _u, c) => ({
        pos: at(c, c.ball.s + 0.75 * c.reach, 0.04, 0.12),
        look: c.ball.position.clone().addScaledVector(frame(c, c.ball.s).U, 0.01),
        fov: 46,
      }),
    },
    {
      // G — curves: side angle, gliding alongside.
      from: P.tunnelEnd,
      to: P.curvesEnd,
      pose: (_p, u, c) => ({
        pos: at(c, c.ball.s - 0.25, -1.5 * c.reach, lerp(0.35, 0.6, u)),
        look: c.ball.position.clone(),
        fov: 40,
      }),
    },
    {
      // H — bridge: wide, low shot from beside the water.
      from: P.curvesEnd,
      to: P.bridgeEnd,
      pose: (_p, u, c) => {
        const f = c.world.bridgeFrame;
        return {
          pos: f.pos.clone().addScaledVector(f.R, 3.2 * c.reach).addScaledVector(f.T, lerp(-1.6, 1.4, u)).setY(f.pos.y - 0.42),
          look: c.ball.position.clone().addScaledVector(f.U, 0.06),
          fov: 42,
        };
      },
    },
    {
      // I — obstacles: elevated three-quarter view over the gate as the ball runs under it and banks off the rail.
      from: P.bridgeEnd,
      to: pBounce + 0.008,
      pose: (_p, u, c) => {
        const g = c.world.gateFrame;
        return {
          pos: g.pos.clone().addScaledVector(g.R, -1.9 * c.reach).addScaledVector(g.U, 1.25).addScaledVector(g.T, lerp(-2.6, 0.6, u)),
          look: c.ball.position.clone().lerp(g.pos.clone().addScaledVector(g.U, 0.25), 0.35),
          fov: 40,
        };
      },
    },
    {
      // J — arch: low close-up framing the ball through the stone arch.
      from: pBounce + 0.008,
      to: pArch,
      pose: (_p, _u, c) => ({
        pos: at(c, sPostArch, -0.34, 0.12),
        look: c.ball.position.clone(),
        fov: 34,
      }),
    },
    {
      // K — chase into the final curve.
      from: pArch,
      to: P.obstaclesEnd,
      pose: (_p, _u, c) => ({
        pos: at(c, c.ball.s - 0.8 * c.reach, c.motion.offsetAt(c.ball.s) * 0.6, 0.34),
        look: at(c, c.ball.s + 1, 0, 0.05),
        fov: 42,
      }),
    },
    {
      // L — final green: low chase, then a dramatic cup-level close-up as the ball arrives.
      from: P.obstaclesEnd,
      to: P.greenEnd,
      pose: (_p, u, c) => {
        const chasePos = at(c, c.ball.s - 0.6 * c.reach, c.motion.offsetAt(c.ball.s) * 0.8, 0.11);
        const chaseLook = cup.clone().addScaledVector(Tg, 0.2);
        const closePos = cup.clone().addScaledVector(Tg, 0.34).addScaledVector(Rg, 0.12).add(v(0, 0.045, 0));
        const closeLook = cup.clone().addScaledVector(Tg, -0.18).add(v(0, 0.01, 0));
        const k = smoothstep(0.52, 0.82, u);
        return {
          pos: chasePos.lerp(closePos, k),
          look: chaseLook.lerp(closeLook, k),
          fov: lerp(42, 30, k),
        };
      },
    },
    {
      // M — the drop: tight on the cup.
      from: P.greenEnd,
      to: P.dropEnd,
      pose: (_p, u) => {
        const e = ease(u);
        return {
          pos: cup.clone().addScaledVector(Tg, lerp(0.34, 0.24, e)).addScaledVector(Rg, lerp(0.12, 0.08, e)).add(v(0, lerp(0.045, 0.07, e), 0)),
          look: cup.clone().addScaledVector(Tg, lerp(-0.18, -0.02, e)).add(v(0, lerp(0.01, -0.03, e), 0)),
          fov: lerp(30, 32, e),
        };
      },
    },
    {
      // N — finale: crane up and back to reveal the whole illuminated course.
      from: P.dropEnd,
      to: 1,
      pose: (_p, u, c) => {
        const start = cup.clone().addScaledVector(Tg, 0.24).addScaledVector(Rg, 0.08).add(v(0, 0.07, 0));
        // Rise above the green and look back along the whole lit course towards the hall.
        const end = cup.clone().addScaledVector(Rg, 6 * c.reach).addScaledVector(Tg, 3.5).add(v(0, 5.2 * c.reach, 0));
        const rise = 1 - (1 - u) ** 3;
        const travel = ease(u);
        const pos = new Vector3(lerp(start.x, end.x, travel), lerp(start.y, end.y, rise), lerp(start.z, end.z, travel));
        const target = center.clone().lerp(cup, 0.35).add(v(0, 0.4, 0));
        const look = cup.clone().add(v(0, -0.03, 0)).lerp(target, smoothstep(0.05, 0.75, u));
        return { pos, look, fov: lerp(32, 46, ease(u)) };
      },
    },
  ];

  const BLEND = 0.01;

  function evalShot(shot: Shot, p: number, c: ShotContext): CameraPose {
    const u = Math.min(1, Math.max(0, (p - shot.from) / (shot.to - shot.from)));
    return shot.pose(p, u, c);
  }

  function mix(out: CameraPose, other: CameraPose, k: number) {
    out.pos.lerp(other.pos, k);
    out.look.lerp(other.look, k);
    out.fov = lerp(out.fov, other.fov, k);
  }

  return {
    /**
     * Within ±BLEND of a boundary the weight of the next shot rises smoothly
     * from 0 to 1 (0.5 exactly at the boundary), so the pose is continuous.
     */
    pose(p: number, c: ShotContext, out: CameraPose): CameraPose {
      let idx = shots.findIndex((s) => p < s.to);
      if (idx === -1) idx = shots.length - 1;
      const cur = evalShot(shots[idx], p, c);
      out.pos.copy(cur.pos);
      out.look.copy(cur.look);
      out.fov = cur.fov;
      const next = shots[idx + 1];
      const prev = shots[idx - 1];
      if (next) {
        const k = smoothstep(shots[idx].to - BLEND, shots[idx].to + BLEND, p);
        if (k > 0) mix(out, evalShot(next, p, c), k);
      }
      if (prev) {
        const k = 1 - smoothstep(shots[idx].from - BLEND, shots[idx].from + BLEND, p);
        if (k > 0) mix(out, evalShot(prev, p, c), k);
      }
      return out;
    },
  };
}

export type ShotList = ReturnType<typeof createShots>;
