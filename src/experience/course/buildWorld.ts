import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  SpotLight,
  TorusGeometry,
  Vector3,
  type Material,
  type Texture,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { QualitySettings } from "../quality";
import {
  concreteTextures,
  lawnTextures,
  mulberry32,
  stoneTextures,
  textTexture,
  turfTextures,
  rippleTexture,
  ledBoardTexture,
} from "../materials/textures";
import { CUP, CUP_RADIUS, FLOOR_Y, GREEN_SHAPE, OBSTACLES, type CoursePath, type Frame } from "./path";
import { archProfile, rectProfile, sweep, type Profile, type SweepFrame } from "./sweep";

export const EMERALD = new Color("#00a86b");
const UP = new Vector3(0, 1, 0);

/** Hall (indoor) footprint. The tunnel pierces its front wall. */
export const HALL = { x0: -8, x1: 8, z0: -14.5, z1: 4, height: 7.5 };

export interface WorldText {
  title: string;
  taglineTop: string;
  taglineBottom: string;
  font: string;
  /** Portrait screens: wall typography is set on two lines so it fits the frame. */
  compact?: boolean;
  /** Trackside LED boards along the outdoor course: [0] the website's designer, [1] the founder. */
  trackside?: Array<{ name: string; line: string; tail?: string }>;
}

/** Splits a line at the space nearest its middle. */
function splitLine(line: string): string[] {
  const mid = line.length / 2;
  let best = -1;
  for (let i = 0; i < line.length; i++) if (line[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [line] : [line.slice(0, best), line.slice(best + 1)];
}

export interface World {
  group: Group;
  ledMaterial: ShaderMaterial;
  tunnelRings: InstancedMesh;
  tunnelRingS: number[];
  bollardCaps: InstancedMesh;
  bollardS: number[];
  gateRotor: Object3D;
  water: MeshStandardMaterial;
  cupLight: PointLight;
  cupGlow: MeshBasicMaterial;
  beam: ShaderMaterial;
  hemi: HemisphereLight;
  key: DirectionalLight;
  hallSpot: SpotLight;
  wallGlow: PointLight;
  greenSpot: SpotLight;
  hallEmissive: MeshBasicMaterial[];
  hallText: MeshBasicMaterial[];
  tunnelText: MeshBasicMaterial[];
  finaleText: MeshBasicMaterial;
  stars: PointsMaterial;
  bounds: { center: Vector3; size: number };
  greenFrame: { origin: Vector3; T: Vector3; R: Vector3 };
  bridgeFrame: Frame;
  archFrame: Frame;
  gateFrame: Frame;
}

/* ---------------------------------------------------------------- helpers */

function frames(path: CoursePath, i0: number, i1: number): SweepFrame[] {
  const out: SweepFrame[] = [];
  for (let i = i0; i <= i1; i++) out.push({ pos: path.pos[i], R: path.R[i], U: path.U[i], s: path.s[i] });
  return out;
}

function basis(R: Vector3, U: Vector3, T: Vector3): Quaternion {
  // Local x → R, y → U, z → −T (right-handed because R × U = −T).
  const m = new Matrix4().makeBasis(R, U, T.clone().negate());
  return new Quaternion().setFromRotationMatrix(m);
}

function place(obj: Object3D, pos: Vector3, q?: Quaternion) {
  obj.position.copy(pos);
  if (q) obj.quaternion.copy(q);
  return obj;
}

function shadowed<T extends Mesh | InstancedMesh>(m: T, cast = true, receive = true): T {
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function repeat(tex: Texture, x: number, y = x) {
  const t = tex.clone();
  t.repeat.set(x, y);
  t.needsUpdate = true;
  return t;
}

function textPlane(text: { texture: Texture; aspect: number }, height: number, color: Color | string, opacity = 1) {
  const mat = new MeshBasicMaterial({
    map: text.texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const mesh = new Mesh(new PlaneGeometry(height * text.aspect, height), mat);
  return { mesh, mat };
}

/** Light strip shader: lit behind the ball, a soft light-wave ahead of it. */
function createLedMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uReveal: { value: 0 },
      uOn: { value: EMERALD.clone().multiplyScalar(3.2) },
      uOff: { value: new Color("#06140f") },
    },
    vertexShader: /* glsl */ `
      attribute float aS;
      varying float vS;
      void main() {
        vS = aS;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform vec3 uOn;
      uniform vec3 uOff;
      varying float vS;
      void main() {
        float k = 1.0 - smoothstep(uReveal - 0.05, uReveal + 1.4, vS);
        gl_FragColor = vec4(mix(uOff, uOn, k), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Organic blob used for bushes and tree canopies (deterministic). */
function blobGeometry(detail: number, seed: number): BufferGeometry {
  const base = new IcosahedronGeometry(1, detail);
  base.deleteAttribute("normal");
  base.deleteAttribute("uv");
  const g = mergeVertices(base); // shared vertices → smooth shading
  const pos = g.getAttribute("position");
  const rand = mulberry32(seed);
  const p1 = rand() * 6;
  const p2 = rand() * 6;
  const p3 = rand() * 6;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.2 * Math.sin(3.1 * v.x + p1) * Math.sin(2.7 * v.y + p2) * Math.sin(2.9 * v.z + p3) + 0.08 * Math.sin(9 * v.x + 7 * v.z + p1);
    v.multiplyScalar(1 + n);
    v.y = v.y > 0 ? v.y : v.y * 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A tuft of grass blades. */
function tuftGeometry(): BufferGeometry {
  const positions: number[] = [];
  const rand = mulberry32(99);
  for (let b = 0; b < 7; b++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.04;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 0.12 + rand() * 0.12;
    const lean = (rand() - 0.5) * 0.08;
    const w = 0.012;
    const dx = Math.cos(a + Math.PI / 2) * w;
    const dz = Math.sin(a + Math.PI / 2) * w;
    positions.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + lean, h, z + lean * 0.5);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ world */

export function buildWorld(scene: Scene, path: CoursePath, q: QualitySettings, text: WorldText, sGate: number, sArch: number): World {
  const group = new Group();
  scene.add(group);
  const rand = mulberry32(2024);
  const ts = q.textureSize;

  /* ----- materials */
  const turf = turfTextures(ts);
  const lawn = lawnTextures(ts);
  const concrete = concreteTextures(ts);
  const stone = stoneTextures(ts);

  const turfMat = new MeshStandardMaterial({ map: turf.map, bumpMap: turf.bump, bumpScale: 1.2, roughness: 0.92, metalness: 0 });
  const railMat = new MeshStandardMaterial({ color: "#121816", roughness: 0.38, metalness: 0.7 });
  const slabMat = new MeshStandardMaterial({ color: "#0c1210", roughness: 0.75, metalness: 0.1 });
  const floorMat = new MeshStandardMaterial({ map: repeat(concrete.map, 6), bumpMap: repeat(concrete.bump, 6), bumpScale: 0.3, roughness: 0.32, metalness: 0.05 });
  const wallMat = new MeshStandardMaterial({ map: repeat(concrete.map, 3), color: "#a9b0ad", roughness: 0.8 });
  const finMat = new MeshStandardMaterial({ color: "#0d1311", roughness: 0.5, metalness: 0.6 });
  const stoneMat = new MeshStandardMaterial({ map: stone.map, bumpMap: stone.bump, bumpScale: 2, roughness: 0.88 });
  const darkMetal = new MeshStandardMaterial({ color: "#151b19", roughness: 0.32, metalness: 0.85 });
  const emerald = new MeshBasicMaterial({ color: EMERALD.clone().multiplyScalar(2.6), toneMapped: false });
  const softWhite = new MeshBasicMaterial({ color: new Color("#dff5ec").multiplyScalar(1.6), toneMapped: false });
  const ledMaterial = createLedMaterial();
  const leafMat = new MeshStandardMaterial({ color: "#ffffff", roughness: 1, metalness: 0, envMapIntensity: 0.3 });
  const trunkMat = new MeshStandardMaterial({ color: "#1d1712", roughness: 0.9 });

  /* ----- sky, fog, ground */
  scene.fog = new FogExp2("#030806", 0.022);
  const skyMat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 top = vec3(0.004, 0.009, 0.007);
        vec3 horizon = vec3(0.018, 0.07, 0.048);
        vec3 col = mix(horizon, top, smoothstep(-0.05, 0.45, h));
        float moon = pow(max(dot(vDir, normalize(vec3(0.4, 0.35, -0.85))), 0.0), 900.0);
        col += vec3(0.9, 1.0, 0.95) * moon * 2.0;
        col += vec3(0.0, 0.08, 0.05) * pow(max(dot(vDir, normalize(vec3(0.4, 0.1, -0.85))), 0.0), 6.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  group.add(new Mesh(new IcosahedronGeometry(420, 3), skyMat));

  const starCount = q.tier === "low" ? 250 : 700;
  const starPos: number[] = [];
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.12 + rand() * 0.88;
    const r = Math.sqrt(1 - y * y);
    starPos.push(Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute("position", new Float32BufferAttribute(starPos, 3));
  const stars = new PointsMaterial({ color: "#cfe9df", size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false, depthWrite: false });
  group.add(new Points(starGeo, stars));

  const ground = new Mesh(
    new PlaneGeometry(260, 260),
    new MeshStandardMaterial({ map: repeat(lawn.map, 70), bumpMap: repeat(lawn.bump, 70), bumpScale: 1.5, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, FLOOR_Y - 0.002, -30);
  shadowed(ground, false, true);
  group.add(ground);

  /* ----- lights */
  const hemi = new HemisphereLight("#1c4636", "#020403", 0.5);
  group.add(hemi);

  const key = new DirectionalLight("#d8ecff", 1.4);
  key.castShadow = q.shadows;
  key.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = key.shadow.camera.bottom = -3.5;
  key.shadow.camera.right = key.shadow.camera.top = 3.5;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  group.add(key, key.target);

  /* ----- the track */
  const iEnd = path.segEndIndex.final; // the green is built separately
  const trackFrames = frames(path, 0, iEnd);
  const w = (i: number) => path.width[i];

  group.add(shadowed(new Mesh(sweep(trackFrames, (i) => [[-w(i) / 2, 0], [w(i) / 2, 0]], { uScale: 0.5, vScale: 0.5 }), turfMat), false, true));

  const railL = sweep(trackFrames, (i) => rectProfile(-w(i) / 2 - 0.05, -w(i) / 2, -0.012, 0.07));
  const railR = sweep(trackFrames, (i) => rectProfile(w(i) / 2, w(i) / 2 + 0.05, -0.012, 0.07));
  group.add(shadowed(new Mesh(mergeGeometries([railL, railR]), railMat)));

  const ledL = sweep(trackFrames, (i) => [[-w(i) / 2 - 0.034, 0.0705], [-w(i) / 2 - 0.016, 0.0705]], { withArcLength: true });
  const ledR = sweep(trackFrames, (i) => [[w(i) / 2 + 0.016, 0.0705], [w(i) / 2 + 0.034, 0.0705]], { withArcLength: true });
  group.add(new Mesh(mergeGeometries([ledL, ledR]), ledMaterial));

  const slab = sweep(trackFrames, (i) => {
    const h = path.pos[i].y - FLOOR_Y;
    const t = Math.min(1, Math.max(0, (h - 0.35) / 0.35));
    const bottom = (-h + 0.002) * (1 - t) + -0.16 * t;
    return rectProfile(-w(i) / 2 - 0.07, w(i) / 2 + 0.07, bottom, -0.012);
  });
  group.add(shadowed(new Mesh(slab, slabMat)));

  // End cap behind the tee.
  {
    const f = path.frameAt(0);
    const cap = new Mesh(new BoxGeometry(w(0) + 0.1, 0.082, 0.05), railMat);
    place(cap, f.pos.clone().addScaledVector(f.T, -0.025).addScaledVector(f.U, 0.029), basis(f.R, f.U, f.T));
    const capBase = new Mesh(new BoxGeometry(w(0) + 0.14, -FLOOR_Y, 0.05), slabMat);
    place(capBase, f.pos.clone().addScaledVector(f.T, -0.025).addScaledVector(f.U, FLOOR_Y / 2), basis(f.R, f.U, f.T));
    const capLed = new Mesh(new BoxGeometry(w(0) + 0.06, 0.004, 0.018), emerald);
    place(capLed, f.pos.clone().addScaledVector(f.T, -0.025).addScaledVector(f.U, 0.072), basis(f.R, f.U, f.T));
    group.add(shadowed(cap), shadowed(capBase), capLed);
  }

  // Support pillars under elevated sections.
  {
    const pillarGeo = new CylinderGeometry(0.055, 0.07, 1, 14);
    const spots: Matrix4[] = [];
    let next = 0;
    const bridge0 = path.segStart.bridge;
    const bridge1 = path.segEnd.bridge;
    for (let i = 0; i <= iEnd; i++) {
      const s = path.s[i];
      if (s < next) continue;
      const top = path.pos[i].y - 0.16;
      const h = top - FLOOR_Y;
      if (h < 0.3 || (s > bridge0 - 0.3 && s < bridge1 + 0.3)) continue;
      next = s + 2.2;
      const m = new Matrix4().compose(
        new Vector3(path.pos[i].x, FLOOR_Y + h / 2, path.pos[i].z),
        new Quaternion(),
        new Vector3(1, h, 1),
      );
      spots.push(m);
    }
    const pillars = new InstancedMesh(pillarGeo, darkMetal, spots.length);
    spots.forEach((m, k) => pillars.setMatrixAt(k, m));
    group.add(shadowed(pillars));
  }

  /* ----- the hall (indoor) */
  const hallEmissive: MeshBasicMaterial[] = [];
  const hallText: MeshBasicMaterial[] = [];
  {
    const { x0, x1, z0, z1, height } = HALL;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const floor = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, FLOOR_Y + 0.001, cz);
    group.add(shadowed(floor, false, true));

    const wall = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
      const m = new Mesh(new BoxGeometry(sx, sy, sz), wallMat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      group.add(m);
      return m;
    };
    const yMid = FLOOR_Y + height / 2;
    wall(x1 - x0 + 0.8, height, 0.4, cx, yMid, z1 + 0.2); // back
    wall(0.4, height, z1 - z0, x0 - 0.2, yMid, cz); // left
    wall(0.4, height, z1 - z0, x1 + 0.2, yMid, cz); // right

    // Front wall with an opening where the tunnel passes through.
    const e = path.frameAt(path.segStart.tunnel);
    const ox = 0.86;
    const oy0 = e.pos.y - 0.17;
    const oy1 = e.pos.y + 0.86;
    const fz = z0 - 0.25;
    wall(-ox - x0 + 0.4, height, 0.5, (x0 - 0.4 - ox) / 2, yMid, fz);
    wall(x1 + 0.4 - ox, height, 0.5, (x1 + 0.4 + ox) / 2, yMid, fz);
    wall(ox * 2, oy0 - FLOOR_Y, 0.5, 0, (FLOOR_Y + oy0) / 2, fz);
    wall(ox * 2, FLOOR_Y + height - oy1, 0.5, 0, (oy1 + FLOOR_Y + height) / 2, fz);

    // Architectural fins along the side walls.
    const finGeo = new BoxGeometry(0.1, height - 0.6, 0.32);
    const finCount = Math.floor((z1 - z0 - 1) / 1.5);
    const fins = new InstancedMesh(finGeo, finMat, finCount * 2);
    for (let k = 0; k < finCount; k++) {
      const z = z1 - 1 - k * 1.5;
      fins.setMatrixAt(k * 2, new Matrix4().makeTranslation(x0 + 0.06, FLOOR_Y + (height - 0.6) / 2, z));
      fins.setMatrixAt(k * 2 + 1, new Matrix4().makeTranslation(x1 - 0.06, FLOOR_Y + (height - 0.6) / 2, z));
    }
    group.add(fins);

    // Emerald light lines: skirting on three walls, verticals on the back wall.
    const lineMat = emerald.clone();
    hallEmissive.push(lineMat);
    const lines: BufferGeometry[] = [
      new BoxGeometry(x1 - x0, 0.03, 0.03).translate(cx, FLOOR_Y + 0.1, z1 - 0.02),
      new BoxGeometry(0.03, 0.03, z1 - z0).translate(x0 + 0.02, FLOOR_Y + 0.1, cz),
      new BoxGeometry(0.03, 0.03, z1 - z0).translate(x1 - 0.02, FLOOR_Y + 0.1, cz),
      new BoxGeometry(0.035, height - 1.2, 0.03).translate(-4.6, FLOOR_Y + height / 2, z1 - 0.02),
      new BoxGeometry(0.035, height - 1.2, 0.03).translate(4.6, FLOOR_Y + height / 2, z1 - 0.02),
    ];
    group.add(new Mesh(mergeGeometries(lines), lineMat));

    // Open roof structure: beams and soft light strips (moonlight comes through).
    const beams: BufferGeometry[] = [];
    const strips: BufferGeometry[] = [];
    for (let z = z1 - 1.2; z > z0; z -= 2.2) {
      beams.push(new BoxGeometry(x1 - x0 + 0.8, 0.35, 0.18).translate(cx, FLOOR_Y + height - 0.2, z));
      strips.push(new BoxGeometry(x1 - x0 - 2, 0.02, 0.05).translate(cx, FLOOR_Y + height - 0.39, z));
    }
    beams.push(new BoxGeometry(0.2, 0.3, z1 - z0).translate(x0 + 2.5, FLOOR_Y + height - 0.05, cz));
    beams.push(new BoxGeometry(0.2, 0.3, z1 - z0).translate(x1 - 2.5, FLOOR_Y + height - 0.05, cz));
    group.add(new Mesh(mergeGeometries(beams), finMat));
    const stripMat = softWhite.clone();
    hallEmissive.push(stripMat);
    group.add(new Mesh(mergeGeometries(strips), stripMat));

    // Typography on the back wall.
    const compact = Boolean(text.compact);
    const title = textPlane(textTexture({ font: text.font, lines: [text.title.toUpperCase()], letterSpacing: 0.32, size: 120, weight: 600 }), compact ? 0.19 : 0.3, EMERALD.clone().multiplyScalar(2.2), 0);
    title.mesh.position.set(0, FLOOR_Y + (compact ? 2.9 : 2.72), z1 - 0.03);
    title.mesh.rotation.y = Math.PI;
    const tagLines = compact ? splitLine(text.taglineTop.toUpperCase()) : [text.taglineTop.toUpperCase()];
    const tag = textPlane(textTexture({ font: text.font, lines: tagLines, size: 200, weight: 600, letterSpacing: -0.01, lineHeight: 0.95 }), compact ? 1.15 : 1.05, new Color("#ffffff").multiplyScalar(0.92), 0);
    tag.mesh.position.set(0, FLOOR_Y + 1.95, z1 - 0.03);
    tag.mesh.rotation.y = Math.PI;
    hallText.push(title.mat, tag.mat);
    group.add(title.mesh, tag.mesh);

    // Planters with greenery along the side walls.
    const planterGeo = new BoxGeometry(0.9, 0.55, 5.5);
    for (const x of [x0 + 1.2, x1 - 1.2]) {
      for (const z of [0.5, -7]) {
        const p = new Mesh(planterGeo, finMat);
        p.position.set(x, FLOOR_Y + 0.275, z);
        group.add(shadowed(p));
      }
    }
  }

  /* ----- tunnel */
  const tunnelText: MeshBasicMaterial[] = [];
  let tunnelRings: InstancedMesh;
  const tunnelRingS: number[] = [];
  {
    const i0 = path.segStartIndex.tunnel;
    const i1 = path.segEndIndex.tunnel;
    const tf = frames(path, i0, i1);
    const inner: Profile = [[0.75, -0.16], ...archProfile(0.75, 28, true), [-0.75, -0.16]];
    const outer: Profile = [[-0.86, -0.17], ...archProfile(0.86, 28, false), [0.86, -0.17]];
    const tunnelMat = new MeshStandardMaterial({ map: repeat(concrete.map, 1), color: "#5c6461", roughness: 0.6, metalness: 0.1, side: DoubleSide });
    group.add(shadowed(new Mesh(sweep(tf, () => inner, { uScale: 1.5, vScale: 1.5 }), tunnelMat), false, true));
    group.add(shadowed(new Mesh(sweep(tf, () => outer, { uScale: 1.5, vScale: 1.5 }), tunnelMat)));
    group.add(new Mesh(sweep(tf, () => [[-0.75, -0.013], [0.75, -0.013]]), slabMat));
    for (const [idx, flip] of [[i0, false], [i1, true]] as const) {
      const f = { pos: path.pos[idx], R: path.R[idx], U: path.U[idx], T: path.T[idx] };
      const ring = new Mesh(new RingGeometry(0.75, 0.86, 28, 1, 0, Math.PI), tunnelMat);
      const T = flip ? f.T.clone().negate() : f.T;
      const R = flip ? f.R.clone().negate() : f.R;
      place(ring, f.pos, basis(R, f.U, T));
      group.add(ring);
    }

    // Light rings.
    const ringGeo = new TorusGeometry(0.73, 0.011, 6, 48, Math.PI);
    const ringMat = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
    const s0 = path.segStart.tunnel;
    const len = path.segEnd.tunnel - s0;
    const count = Math.floor(len / 0.7);
    tunnelRings = new InstancedMesh(ringGeo, ringMat, count);
    for (let k = 0; k < count; k++) {
      const s = s0 + 0.35 + k * 0.7;
      const f = path.frameAt(s);
      tunnelRings.setMatrixAt(k, new Matrix4().compose(f.pos, basis(f.R, f.U, f.T), new Vector3(1, 1, 1)));
      tunnelRings.setColorAt(k, new Color("#05130d"));
      tunnelRingS.push(s);
    }
    group.add(tunnelRings);

    // Typography on the tunnel walls.
    for (const [label, at] of [
      ["VISION", 0.3],
      ["MISSION", 0.62],
    ] as const) {
      const f = path.frameAt(s0 + len * at);
      const t = textPlane(textTexture({ font: text.font, lines: [label], size: 160, weight: 600, letterSpacing: 0.18 }), 0.15, EMERALD.clone().multiplyScalar(2.4), 0.12);
      // Facing into the tunnel from the left wall, reading along the direction of travel.
      const m = new Matrix4().makeBasis(f.T, f.U, f.R);
      t.mesh.quaternion.setFromRotationMatrix(m);
      t.mesh.position.copy(f.pos).addScaledVector(f.R, -0.62).addScaledVector(f.U, 0.36);
      tunnelText.push(t.mat);
      group.add(t.mesh);
    }
  }

  /* ----- water channel and bridge */
  const bridgeFrame = path.frameAt((path.segStart.bridge + path.segEnd.bridge) / 2);
  const water = new MeshStandardMaterial({
    color: "#010806",
    roughness: 0.14,
    metalness: 0.2,
    bumpMap: repeat(rippleTexture(256), 18, 1.4),
    bumpScale: 0.6,
    envMapIntensity: 0.6,
  });
  {
    const Rb = new Vector3(bridgeFrame.R.x, 0, bridgeFrame.R.z).normalize();
    const Tb = new Vector3(bridgeFrame.T.x, 0, bridgeFrame.T.z).normalize();
    const center = new Vector3(bridgeFrame.pos.x, FLOOR_Y + 0.05, bridgeFrame.pos.z);
    const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(Rb, UP, Rb.clone().cross(UP)));
    const plane = new Mesh(new PlaneGeometry(60, 3.2).rotateX(-Math.PI / 2), water);
    place(plane, center, q);
    group.add(shadowed(plane, false, true));
    const bed = new Mesh(new PlaneGeometry(60, 3.2).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: "#010504" }));
    place(bed, center.clone().setY(FLOOR_Y + 0.001), q);
    group.add(bed);
    for (const side of [-1, 1]) {
      const kerb = new Mesh(new BoxGeometry(60, 0.24, 0.3), stoneMat);
      place(kerb, center.clone().addScaledVector(Tb, side * 1.75).setY(FLOOR_Y + 0.12), q);
      group.add(shadowed(kerb));
    }

    // Bridge piers, railings and a lit handrail.
    const i0 = path.segStartIndex.bridge;
    const i1 = path.segEndIndex.bridge;
    const bf = frames(path, i0, i1);
    for (const at of [0.9, 5.1]) {
      const f = path.frameAt(path.segStart.bridge + at);
      const h = f.pos.y - 0.16 - FLOOR_Y;
      const pier = new Mesh(new BoxGeometry(path.width[i0] + 0.3, h, 0.45), stoneMat);
      place(pier, new Vector3(f.pos.x, FLOOR_Y + h / 2, f.pos.z), basis(f.R, UP, f.T));
      group.add(shadowed(pier));
    }
    const bw = path.width[i0];
    const handL = sweep(bf, () => rectProfile(-bw / 2 - 0.05, -bw / 2 - 0.015, 0.42, 0.45));
    const handR = sweep(bf, () => rectProfile(bw / 2 + 0.015, bw / 2 + 0.05, 0.42, 0.45));
    group.add(shadowed(new Mesh(mergeGeometries([handL, handR]), darkMetal)));
    const glowL = sweep(bf, () => [[-bw / 2 - 0.02, 0.418], [-bw / 2 - 0.045, 0.418]], { withArcLength: true });
    const glowR = sweep(bf, () => [[bw / 2 + 0.045, 0.418], [bw / 2 + 0.02, 0.418]], { withArcLength: true });
    group.add(new Mesh(mergeGeometries([glowL, glowR]), ledMaterial));
    const postGeo = new BoxGeometry(0.022, 0.35, 0.022);
    const posts: Matrix4[] = [];
    for (let s = path.segStart.bridge + 0.1; s < path.segEnd.bridge; s += 0.5) {
      const f = path.frameAt(s);
      for (const side of [-1, 1]) {
        posts.push(new Matrix4().compose(f.pos.clone().addScaledVector(f.R, side * (bw / 2 + 0.033)).addScaledVector(f.U, 0.245), basis(f.R, f.U, f.T), new Vector3(1, 1, 1)));
      }
    }
    const postMesh = new InstancedMesh(postGeo, darkMetal, posts.length);
    posts.forEach((m, k) => postMesh.setMatrixAt(k, m));
    group.add(shadowed(postMesh));
  }

  /* ----- obstacles */
  const gateFrame = path.frameAt(sGate);
  const archFrame = path.frameAt(sArch);
  const gateRotor = new Group();
  {
    const f = gateFrame;
    const ow = f.width;
    const q = basis(f.R, f.U, f.T);
    for (const side of [-1, 1]) {
      const h = f.pos.y + 0.78 - FLOOR_Y;
      const post = new Mesh(new BoxGeometry(0.11, h, 0.11), darkMetal);
      place(post, f.pos.clone().addScaledVector(f.R, side * (ow / 2 + 0.14)).setY(FLOOR_Y + h / 2), q);
      group.add(shadowed(post));
    }
    const beam = new Mesh(new BoxGeometry(ow + 0.4, 0.08, 0.1), darkMetal);
    place(beam, f.pos.clone().addScaledVector(f.U, 0.78), q);
    const rod = new Mesh(new CylinderGeometry(0.012, 0.012, 0.36), darkMetal);
    place(rod, f.pos.clone().addScaledVector(f.U, 0.6), q);
    group.add(shadowed(beam), shadowed(rod));

    place(gateRotor, f.pos.clone().addScaledVector(f.U, 0.42), q);
    const hub = new Mesh(new CylinderGeometry(0.05, 0.05, 0.06, 24).rotateX(Math.PI / 2), emerald);
    gateRotor.add(hub);
    for (let k = 0; k < 4; k++) {
      const blade = new Group();
      blade.rotation.z = (k * Math.PI) / 2;
      const plate = new Mesh(new BoxGeometry(0.05, 0.33, 0.016), darkMetal);
      plate.position.y = -0.2;
      const edge = new Mesh(new BoxGeometry(0.006, 0.3, 0.018), emerald);
      edge.position.set(0.026, -0.2, 0);
      blade.add(shadowed(plate), edge);
      gateRotor.add(blade);
    }
    group.add(gateRotor);
  }
  {
    // Stone arch spanning the track.
    const f = archFrame;
    const half = f.width / 2 + 0.14;
    const q = basis(f.R, f.U, f.T);
    for (const side of [-1, 1]) {
      const h = f.pos.y + 0.5 - FLOOR_Y;
      const pillar = new Mesh(new BoxGeometry(0.2, h, 0.24), stoneMat);
      place(pillar, f.pos.clone().addScaledVector(f.R, side * half).setY(FLOOR_Y + h / 2), q);
      group.add(shadowed(pillar));
    }
    const arch = new Mesh(new TorusGeometry(half, 0.1, 10, 36, Math.PI), stoneMat);
    place(arch, f.pos.clone().addScaledVector(f.U, 0.5), q);
    const keystone = new Mesh(new BoxGeometry(0.08, 0.04, 0.26), emerald);
    place(keystone, f.pos.clone().addScaledVector(f.U, 0.5 + half + 0.1), q);
    group.add(shadowed(arch), keystone);

    // Bumper posts.
    for (const p of OBSTACLES.posts) {
      const pf = path.frameAt(path.segStart.obstacles + p.at);
      const post = new Mesh(new CylinderGeometry(0.045, 0.05, 0.12, 24), stoneMat);
      place(post, pf.pos.clone().addScaledVector(pf.R, p.offset).addScaledVector(pf.U, 0.06), basis(pf.R, pf.U, pf.T));
      const ring = new Mesh(new CylinderGeometry(0.047, 0.047, 0.008, 24), emerald);
      place(ring, pf.pos.clone().addScaledVector(pf.R, p.offset).addScaledVector(pf.U, 0.115), basis(pf.R, pf.U, pf.T));
      group.add(shadowed(post), ring);
    }
  }

  /* ----- final green, cup and finale sign */
  const iG = path.segStartIndex.green;
  const G0 = path.pos[iG].clone();
  const Tg = path.T[iG].clone().setY(0).normalize();
  const Rg = path.R[iG].clone().setY(0).normalize();
  const toWorld = (x: number, y: number, h = 0) => G0.clone().addScaledVector(Rg, x).addScaledVector(Tg, y).addScaledVector(UP, h);
  const cupPos = toWorld(CUP.offset, CUP.at);
  const cupGlow = new MeshBasicMaterial({ color: EMERALD.clone().multiplyScalar(0.4), toneMapped: false });
  const cupLight = new PointLight("#19d18c", 0, 2.5, 2);
  // Light beam that rises out of the cup when the ball drops.
  const beamMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uIntensity: { value: 0 }, uColor: { value: EMERALD.clone().multiplyScalar(1.6) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float a = pow(1.0 - vUv.y, 2.2) * uIntensity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  {
    const { halfWidth: hw, start, end, radius: r } = GREEN_SHAPE;
    const shape = new Shape();
    shape.moveTo(-hw + r, start);
    shape.lineTo(hw - r, start);
    shape.quadraticCurveTo(hw, start, hw, start + r);
    shape.lineTo(hw, end - r);
    shape.quadraticCurveTo(hw, end, hw - r, end);
    shape.lineTo(-hw + r, end);
    shape.quadraticCurveTo(-hw, end, -hw, end - r);
    shape.lineTo(-hw, start + r);
    shape.quadraticCurveTo(-hw, start, -hw + r, start);
    const hole = new Shape();
    hole.absarc(CUP.offset, CUP.at, CUP_RADIUS, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const g = new ShapeGeometry(shape, 48);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const p = toWorld(x, y);
      pos.setXYZ(i, p.x, p.y, p.z);
      uv.setXY(i, x / 0.5, y / 0.5);
    }
    g.computeVertexNormals();
    g.computeBoundingSphere();
    group.add(shadowed(new Mesh(g, turfMat), false, true));

    // Rails and plinth around the green, open where the track enters.
    const outline = shape.getSpacedPoints(160);
    const gap = path.width[iG] / 2 + 0.05;
    const pts = outline.filter((v) => !(Math.abs(v.y - start) < 1e-3 && Math.abs(v.x) < gap));
    // Rotate so the gap sits at the ends of the polyline.
    let cut = 0;
    for (let k = 1; k < pts.length; k++) if (pts[k].distanceTo(pts[k - 1]) > 0.3) cut = k;
    const ordered = [...pts.slice(cut), ...pts.slice(0, cut)];
    const gf: SweepFrame[] = [];
    let acc = 0;
    ordered.forEach((v, k) => {
      const prev = ordered[Math.max(0, k - 1)];
      const nxt = ordered[Math.min(ordered.length - 1, k + 1)];
      const dx = nxt.x - prev.x;
      const dy = nxt.y - prev.y;
      // Outward normal of a counter-clockwise outline.
      const nLocal = new Vector3(dy, -dx, 0).normalize();
      const R = Rg.clone().multiplyScalar(nLocal.x).addScaledVector(Tg, nLocal.y).normalize();
      if (k > 0) acc += v.distanceTo(prev);
      gf.push({ pos: toWorld(v.x, v.y), R, U: UP, s: acc });
    });
    const plinthDepth = FLOOR_Y - G0.y;
    const railProfile: Profile = [
      [0, 0],
      [0, 0.075],
      [0, 0.075],
      [0.06, 0.075],
      [0.06, 0.075],
      [0.06, plinthDepth],
    ];
    const railMesh = new Mesh(sweep(gf, () => railProfile), railMat.clone());
    (railMesh.material as MeshStandardMaterial).side = DoubleSide;
    group.add(shadowed(railMesh));
    const greenLed = new Mesh(sweep(gf, () => [[0.012, 0.0755], [0.048, 0.0755]]), emerald);
    (greenLed.material as Material).side = DoubleSide;
    group.add(greenLed);

    // The cup.
    const cupMat = new MeshStandardMaterial({ color: "#0b0f0d", roughness: 0.6, side: DoubleSide });
    const cup = new Mesh(new CylinderGeometry(CUP_RADIUS, CUP_RADIUS, 0.1, 40, 1, true), cupMat);
    cup.position.copy(cupPos).addScaledVector(UP, -0.05);
    const liner = new Mesh(new CylinderGeometry(CUP_RADIUS - 0.0005, CUP_RADIUS - 0.0005, 0.02, 40, 1, true), new MeshStandardMaterial({ color: "#e9eeec", roughness: 0.4, side: DoubleSide }));
    liner.position.copy(cupPos).addScaledVector(UP, -0.024);
    const bottom = new Mesh(new CircleGeometry(CUP_RADIUS, 40).rotateX(-Math.PI / 2), cupGlow);
    bottom.position.copy(cupPos).addScaledVector(UP, -0.099);
    cupLight.position.copy(cupPos).addScaledVector(UP, 0.45);
    const beam = new Mesh(new CylinderGeometry(CUP_RADIUS * 1.6, CUP_RADIUS * 0.95, 1.4, 32, 1, true), beamMat);
    beam.position.copy(cupPos).addScaledVector(UP, 0.7);
    group.add(cup, liner, bottom, cupLight, beam);
  }

  const finaleTex = textTexture({ font: text.font, lines: [text.taglineBottom.toUpperCase()], size: 200, weight: 600 });
  const finale = textPlane(finaleTex, 0.9, new Color("#ffffff").multiplyScalar(1.1), 0.08);
  {
    const p = toWorld(0, GREEN_SHAPE.end + 2.6, 1.2);
    finale.mesh.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(Rg, UP, Tg.clone().negate()));
    finale.mesh.position.copy(p);
    const plinth = new Mesh(new BoxGeometry(finale.mesh.geometry.parameters.width * 0.9, 0.5, 0.4), stoneMat);
    place(plinth, toWorld(0, GREEN_SHAPE.end + 2.75, 0.25 - (G0.y - FLOOR_Y)), finale.mesh.quaternion);
    group.add(finale.mesh, shadowed(plinth));
  }

  /* ----- spot and glow lights */
  const hallSpot = new SpotLight("#fff4e6", 0, 14, 0.42, 0.75, 1.6);
  hallSpot.position.set(0.6, 5.6, -0.2);
  hallSpot.target.position.set(0, 0, -1.4);
  group.add(hallSpot, hallSpot.target);
  const wallGlow = new PointLight("#00a86b", 0, 10, 2);
  wallGlow.position.set(0, FLOOR_Y + 2.6, HALL.z1 - 0.8);
  group.add(wallGlow);
  const greenSpot = new SpotLight("#e8fff5", 0, 14, 0.5, 0.8, 1.4);
  greenSpot.position.copy(toWorld(-1.2, 1.2, 6.5));
  greenSpot.target.position.copy(cupPos);
  group.add(greenSpot, greenSpot.target);

  /* ----- garden lights along the outdoor course */
  const bollardS: number[] = [];
  const bollardMatrices: Matrix4[] = [];
  {
    const Tb = new Vector3(bridgeFrame.T.x, 0, bridgeFrame.T.z).normalize();
    for (let s = path.segEnd.tunnel + 0.8; s < path.length - 0.5; s += 2.4) {
      const f = path.frameAt(s);
      for (const side of [-1, 1]) {
        const p = f.pos.clone().addScaledVector(f.R, side * (f.width / 2 + (path.segmentAt(s) === "green" ? 1.0 : 0.5))).setY(FLOOR_Y);
        const d = p.clone().sub(bridgeFrame.pos).setY(0);
        if (Math.abs(d.dot(Tb)) < 2.1) continue; // keep out of the water
        bollardS.push(s);
        bollardMatrices.push(new Matrix4().makeTranslation(p.x, p.y, p.z));
      }
    }
  }
  const bodyGeo = new CylinderGeometry(0.045, 0.055, 0.46, 12).translate(0, 0.23, 0);
  const bodies = new InstancedMesh(bodyGeo, darkMetal, bollardMatrices.length);
  const capGeo = new CylinderGeometry(0.05, 0.05, 0.05, 12).translate(0, 0.485, 0);
  const bollardCaps = new InstancedMesh(capGeo, new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), bollardMatrices.length);
  bollardMatrices.forEach((m, k) => {
    bodies.setMatrixAt(k, m);
    bollardCaps.setMatrixAt(k, m);
    bollardCaps.setColorAt(k, new Color("#0a1a14"));
  });
  group.add(shadowed(bodies), bollardCaps);

  /* ----- greenery */
  const sampleCourse: Vector3[] = [];
  for (let s = 0; s < path.length; s += 0.8) sampleCourse.push(path.frameAt(s).pos);
  const nearestCourse = (x: number, z: number) => {
    let best = Infinity;
    for (const p of sampleCourse) best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2);
    return Math.sqrt(best);
  };
  const inHall = (x: number, z: number, m = 0.6) => x > HALL.x0 - m && x < HALL.x1 + m && z > HALL.z0 - m && z < HALL.z1 + m;
  const inWater = (x: number, z: number) => {
    const d = new Vector3(x - bridgeFrame.pos.x, 0, z - bridgeFrame.pos.z);
    return Math.abs(d.dot(new Vector3(bridgeFrame.T.x, 0, bridgeFrame.T.z).normalize())) < 2.2;
  };
  const greens = ["#0f3a26", "#12462d", "#0b2e1f", "#174f33", "#0d3523"].map((c) => new Color(c));

  /* ----- trackside LED boards, like the boards along a race track */
  const boardSpots: Vector3[] = [];
  if (text.trackside?.length) {
    const L = 2.4; // board length (m)
    const lift = 0.42; // on posts, so the board clears the garden lights in front of it
    const faces = text.trackside.map((t) => {
      const tex = ledBoardTexture({ font: text.font, ...t });
      // Bright enough to catch the bloom: the boards glow a little in the night scene.
      return { mat: new MeshBasicMaterial({ map: tex.texture, color: new Color("#ffffff").multiplyScalar(1.35), toneMapped: false }), H: L / tex.aspect };
    });
    const H = faces[0].H;
    const frameGeo = new BoxGeometry(L + 0.06, H + 0.06, 0.05);
    const legGeo = new BoxGeometry(0.035, lift, 0.035);
    const glowGeo = new BoxGeometry(L, 0.012, 0.03);
    const glowMat = new MeshBasicMaterial({ color: EMERALD.clone().multiplyScalar(2.6), toneMapped: false });
    // Spots measured from the camera's actual view (on screen, facing it, with
    // nothing in the way), from the S-curves to the final green.
    // [distance along the course, side, extra distance from the edge, which board]
    const C = 0; // designer
    const F = 1; // founder
    const wanted: Array<[number, number, number, number]> = [
      [path.segStart.curves + 11.5, 1, 1.9, C],
      [path.segStart.curves + 13, -1, 0.95, F],
      [path.segStart.obstacles + 1.8, -1, 0.95, F],
      [path.segStart.obstacles + 1.8, 1, 0.95, C],
      [path.segStart.obstacles + 4.3, 1, 1.4, C],
      [path.segStart.obstacles + 6.8, 1, 1.9, C],
      [path.segStart.green + 0.65, 1, 1.9, C],
    ];
    const Z = new Vector3(0, 0, 1);
    for (const [s0, wantSide, off, which] of wanted) {
      const face = faces[Math.min(which, faces.length - 1)];
      const f = path.frameAt(s0);
      const Th = new Vector3(f.T.x, 0, f.T.z).normalize();
      const Rh = new Vector3(f.R.x, 0, f.R.z).normalize();
      let best: { p: Vector3; side: number } | undefined;
      for (const side of [wantSide, -wantSide]) {
        const p = f.pos.clone().addScaledVector(Rh, side * (f.width / 2 + off)).setY(FLOOR_Y);
        const ends = [p, p.clone().addScaledVector(Th, L / 2), p.clone().addScaledVector(Th, -L / 2)];
        if (ends.some((e) => inWater(e.x, e.z) || inHall(e.x, e.z))) continue;
        if (Math.min(...ends.map((e) => nearestCourse(e.x, e.z))) > 0.8) {
          best = { p, side };
          break;
        }
      }
      if (!best) continue;
      const board = new Group();
      const y = lift + (H + 0.06) / 2;
      const panel = shadowed(new Mesh(frameGeo, darkMetal));
      panel.position.set(0, y, 0);
      const screen = new Mesh(new PlaneGeometry(L, face.H), face.mat);
      screen.position.set(0, y, 0.026);
      const glow = new Mesh(glowGeo, glowMat); // LED strip along the bottom edge
      glow.position.set(0, lift - 0.004, 0.012);
      board.add(panel, screen, glow);
      for (const lx of [-L / 2 + 0.2, L / 2 - 0.2]) {
        const leg = shadowed(new Mesh(legGeo, darkMetal));
        leg.position.set(lx, lift / 2, 0);
        board.add(leg);
      }
      board.position.copy(best.p);
      board.quaternion.copy(new Quaternion().setFromUnitVectors(Z, Rh.clone().multiplyScalar(-best.side)));
      group.add(board);
      boardSpots.push(best.p);
    }
  }
  const nearBoard = (x: number, z: number) => boardSpots.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < 1.6 * 1.6);

  const bushGeo = blobGeometry(2, 7);
  const bushMatrices: Matrix4[] = [];
  const outdoorStart = path.segEnd.tunnel - 1;
  let attempts = 0;
  while (bushMatrices.length < q.bushes && attempts++ < q.bushes * 40) {
    const s = outdoorStart + rand() * (path.length + 6 - outdoorStart);
    const f = path.frameAt(s);
    const side = rand() < 0.5 ? -1 : 1;
    const lat = f.width / 2 + 0.9 + rand() * 3.2;
    const x = f.pos.x + f.R.x * side * lat;
    const z = f.pos.z + f.R.z * side * lat;
    if (inHall(x, z) || inWater(x, z) || nearestCourse(x, z) < 0.9 || nearBoard(x, z)) continue;
    const sc = 0.22 + rand() * 0.45;
    bushMatrices.push(new Matrix4().compose(new Vector3(x, FLOOR_Y + sc * 0.45, z), new Quaternion().setFromAxisAngle(UP, rand() * 6.28), new Vector3(sc * (1 + rand() * 0.6), sc, sc * (1 + rand() * 0.6))));
  }
  // Indoor planters.
  for (const x of [HALL.x0 + 1.2, HALL.x1 - 1.2]) {
    for (const zc of [0.5, -7]) {
      for (let k = 0; k < 5; k++) {
        const sc = 0.28 + rand() * 0.16;
        bushMatrices.push(new Matrix4().compose(new Vector3(x + (rand() - 0.5) * 0.3, FLOOR_Y + 0.55 + sc * 0.4, zc - 2.2 + k * 1.1), new Quaternion().setFromAxisAngle(UP, rand() * 6.28), new Vector3(sc * 1.3, sc, sc * 1.1)));
      }
    }
  }
  const bushes = new InstancedMesh(bushGeo, leafMat, bushMatrices.length);
  bushMatrices.forEach((m, k) => {
    bushes.setMatrixAt(k, m);
    bushes.setColorAt(k, greens[k % greens.length]);
  });
  group.add(shadowed(bushes));

  const canopy = mergeGeometries([
    blobGeometry(2, 3).scale(1.1, 0.9, 1.1).translate(0, 2.4, 0),
    blobGeometry(1, 4).scale(0.8, 0.7, 0.8).translate(0.4, 3.2, 0.2),
    blobGeometry(1, 5).scale(0.7, 0.6, 0.7).translate(-0.35, 3.0, -0.3),
  ]);
  const trunkGeo = new CylinderGeometry(0.07, 0.12, 2.4, 8).translate(0, 1.2, 0);
  const treeMatrices: Matrix4[] = [];
  attempts = 0;
  while (treeMatrices.length < q.trees && attempts++ < q.trees * 60) {
    const s = outdoorStart - 4 + rand() * (path.length + 14 - outdoorStart);
    const f = path.frameAt(s);
    const side = rand() < 0.5 ? -1 : 1;
    const lat = 4 + rand() * 22;
    const x = f.pos.x + f.R.x * side * lat;
    const z = f.pos.z + f.R.z * side * lat;
    if (inHall(x, z, 1.5) || inWater(x, z) || nearestCourse(x, z) < 3.2) continue;
    const sc = 0.8 + rand() * 0.9;
    const tall = rand() < 0.35;
    treeMatrices.push(new Matrix4().compose(new Vector3(x, FLOOR_Y, z), new Quaternion().setFromAxisAngle(UP, rand() * 6.28), new Vector3(sc * (tall ? 0.55 : 1), sc * (tall ? 1.7 : 1), sc * (tall ? 0.55 : 1))));
  }
  const canopies = new InstancedMesh(canopy, leafMat, treeMatrices.length);
  const trunks = new InstancedMesh(trunkGeo, trunkMat, treeMatrices.length);
  treeMatrices.forEach((m, k) => {
    canopies.setMatrixAt(k, m);
    canopies.setColorAt(k, greens[(k * 3) % greens.length].clone().multiplyScalar(0.8));
    trunks.setMatrixAt(k, m);
  });
  group.add(shadowed(canopies), shadowed(trunks));

  if (q.grassTufts > 0) {
    const tuft = tuftGeometry();
    const tuftMat = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, side: DoubleSide });
    const mats: Matrix4[] = [];
    attempts = 0;
    while (mats.length < q.grassTufts && attempts++ < q.grassTufts * 10) {
      const s = outdoorStart + rand() * (path.length + 4 - outdoorStart);
      const f = path.frameAt(s);
      const lat = (rand() - 0.5) * 2 * (f.width / 2 + 5);
      const x = f.pos.x + f.R.x * lat;
      const z = f.pos.z + f.R.z * lat;
      if (inWater(x, z) || inHall(x, z) || nearBoard(x, z)) continue;
      const sc = 0.7 + rand() * 0.9;
      mats.push(new Matrix4().compose(new Vector3(x, FLOOR_Y, z), new Quaternion().setFromAxisAngle(UP, rand() * 6.28), new Vector3(sc, sc, sc)));
    }
    const tufts = new InstancedMesh(tuft, tuftMat, mats.length);
    mats.forEach((m, k) => {
      tufts.setMatrixAt(k, m);
      tufts.setColorAt(k, greens[k % greens.length].clone().multiplyScalar(1.2));
    });
    group.add(tufts);
  }

  /* ----- bounds for the finale overview */
  const min = new Vector3(Infinity, 0, Infinity);
  const max = new Vector3(-Infinity, 0, -Infinity);
  for (const p of path.pos) {
    min.min(p);
    max.max(p);
  }
  const center = min.clone().add(max).multiplyScalar(0.5).setY(0);
  const size = Math.max(max.x - min.x, max.z - min.z);

  return {
    group,
    ledMaterial,
    tunnelRings: tunnelRings!,
    tunnelRingS,
    bollardCaps,
    bollardS,
    gateRotor,
    water,
    cupLight,
    cupGlow,
    beam: beamMat,
    hemi,
    key,
    hallSpot,
    wallGlow,
    greenSpot,
    hallEmissive,
    hallText,
    tunnelText,
    finaleText: finale.mat,
    stars,
    bounds: { center, size },
    greenFrame: { origin: G0, T: Tg, R: Rg },
    bridgeFrame,
    archFrame,
    gateFrame,
  };
}
