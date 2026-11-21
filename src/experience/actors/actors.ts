import {
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  BoxGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BALL_RADIUS, type CoursePath } from "../course/path";
import { EMERALD } from "../course/buildWorld";
import { dimpleTexture, radialTexture } from "../materials/textures";
import { IMPACT_U, P, smoothstep } from "../timeline/chapters";

/* -------------------------------------------------------------------- ball */

export function createBall(textureSize: number) {
  const bump = dimpleTexture(Math.min(1024, textureSize));
  const material = new MeshPhysicalMaterial({
    color: "#f3f5f4",
    roughness: 0.34,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    bumpMap: bump,
    bumpScale: 0.9,
  });
  const mesh = new Mesh(new SphereGeometry(BALL_RADIUS, 64, 40), material);
  mesh.castShadow = true;

  // Soft contact shadow so the ball sits on the surface on every quality tier.
  const shadowMat = new MeshBasicMaterial({ map: radialTexture(128, "rgba(0,0,0,0.75)"), transparent: true, depthWrite: false, opacity: 0.85 });
  const shadow = new Mesh(new PlaneGeometry(BALL_RADIUS * 3.2, BALL_RADIUS * 3.2), shadowMat);
  return { mesh, shadow, shadowMat };
}

/* ------------------------------------------------------------------ putter */

const LIE = Math.atan2(0.93, 0.37); // ~68° shaft lie angle
const SHAFT_DIR = new Vector3(-Math.cos(LIE), Math.sin(LIE), 0); // leans towards the golfer
const HEEL = new Vector3(-0.042, 0.022, 0.004);
const PIVOT_LEN = 0.98;

/**
 * Traditional blade putter: milled steel head with an emerald sight line,
 * chrome shaft and rubber grip. Local frame: x across the line, y up,
 * −z towards the target (the face looks down −z).
 */
function buildPutterModel() {
  const model = new Group();
  const steel = new MeshStandardMaterial({ color: "#c9cfcc", roughness: 0.26, metalness: 1, envMapIntensity: 7 });
  const darkSteel = new MeshStandardMaterial({ color: "#2a302e", roughness: 0.35, metalness: 0.9, envMapIntensity: 5 });
  const chrome = new MeshStandardMaterial({ color: "#e8ecea", roughness: 0.1, metalness: 1, envMapIntensity: 7 });
  const rubber = new MeshStandardMaterial({ color: "#0b0d0c", roughness: 0.75 });
  const sight = new MeshBasicMaterial({ color: EMERALD.clone().multiplyScalar(1.3), toneMapped: false });

  const head = new Mesh(new RoundedBoxGeometry(0.104, 0.024, 0.028, 4, 0.004), steel);
  head.position.set(0, 0.012, 0);
  const cavity = new Mesh(new RoundedBoxGeometry(0.07, 0.012, 0.012, 2, 0.002), darkSteel);
  cavity.position.set(0, 0.016, 0.009);
  const insert = new Mesh(new BoxGeometry(0.07, 0.014, 0.0015), darkSteel);
  insert.position.set(0, 0.012, -0.0142);
  const line = new Mesh(new BoxGeometry(0.0022, 0.0006, 0.022), sight);
  line.position.set(0, 0.0243, -0.002);

  // Plumber's-neck hosel joining heel to shaft.
  const hosel = new Mesh(new CylinderGeometry(0.0042, 0.0042, 0.03, 12), steel);
  hosel.position.copy(HEEL).add(new Vector3(0, 0.015, 0));
  const neck = new Mesh(new CylinderGeometry(0.0042, 0.0042, 0.018, 12), steel);
  neck.rotation.z = Math.PI / 2;
  neck.position.copy(HEEL).add(new Vector3(-0.006, 0.03, 0));

  const shaftLen = 0.7;
  const shaftStart = HEEL.clone().add(new Vector3(-0.013, 0.03, 0));
  const shaft = new Mesh(new CylinderGeometry(0.0046, 0.0056, shaftLen, 16), chrome);
  const gripLen = 0.27;
  const grip = new Mesh(new CylinderGeometry(0.0125, 0.0105, gripLen, 20), rubber);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), SHAFT_DIR);
  shaft.quaternion.copy(q);
  shaft.position.copy(shaftStart).addScaledVector(SHAFT_DIR, shaftLen / 2);
  grip.quaternion.copy(q);
  grip.position.copy(shaftStart).addScaledVector(SHAFT_DIR, shaftLen + gripLen / 2 - 0.01);

  for (const m of [head, cavity, insert, hosel, neck, shaft, grip]) m.castShadow = true;
  model.add(head, cavity, insert, line, hosel, neck, shaft, grip);
  return model;
}

export function createPutter(path: CoursePath, ballS: number) {
  const root = new Group();
  const swing = new Group();
  const model = buildPutterModel();
  root.add(swing);
  swing.add(model);

  // Address position: face square to the line, just behind the ball.
  const f = path.frameAt(ballS);
  const headOrigin = f.pos.clone().addScaledVector(f.T, -(BALL_RADIUS + 0.003 + 0.014));
  const pivotLocal = HEEL.clone().addScaledVector(SHAFT_DIR, PIVOT_LEN);
  model.position.copy(pivotLocal).negate();
  const basisQ = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(f.R, f.U, f.T.clone().negate()));
  const address = headOrigin.clone().add(pivotLocal.clone().applyQuaternion(basisQ));
  root.quaternion.copy(basisQ);

  // Swing axis: perpendicular to the shaft and the target line (pendulum stroke).
  const axis = new Vector3().crossVectors(SHAFT_DIR, new Vector3(0, 0, 1)).normalize();
  const entryOffset = f.U.clone().multiplyScalar(0.32).addScaledVector(f.R, -0.18).addScaledVector(f.T, -0.12);

  /** Swing angle (radians): negative = backswing, positive = follow-through. */
  const angleAt = (u: number) => {
    if (u < 0.4) return 0;
    if (u < 0.66) return -0.3 * smoothstep(0.4, 0.66, u);
    if (u < IMPACT_U) {
      const k = (u - 0.66) / (IMPACT_U - 0.66);
      return -0.3 * (1 - k * k); // accelerating through the ball
    }
    const k = (u - IMPACT_U) / (1 - IMPACT_U);
    return 0.26 * Math.sin((k * Math.PI) / 2);
  };

  return {
    root,
    update(p: number) {
      const visible = p > P.brandEnd - 0.005 && p < P.rampEnd;
      root.visible = visible;
      if (!visible) return;
      const u = Math.min(1, Math.max(0, (p - P.brandEnd) / (P.swingEnd - P.brandEnd)));
      const enter = smoothstep(0, 0.32, u);
      root.position.copy(address).addScaledVector(entryOffset, 1 - enter);
      swing.quaternion.setFromAxisAngle(axis, angleAt(u) + (1 - enter) * -0.5);
    },
  };
}
