import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Euler,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { dimpleTexture } from "@/experience/materials/textures";

/**
 * The homepage hero scene, driven by scroll: a golf ball in free fall,
 * tearing through the sky — air streaks, clouds and rings of light rushing
 * past, the camera shaking — heating up like a meteor until it burns apart
 * into embers that gather into the SL Mini Golf Association logo.
 *
 * Scroll progress p (0 → 1):
 *   0.00 – 0.68  free fall, speeding up; the ball heats on its leading side
 *                (the homepage's story appears beside the ball meanwhile)
 *   0.68 – 0.83  it burns apart into embers (from the hot underside up)
 *   0.83 – 0.95  the embers gather into the logo, the fall slows to a stop
 *   0.95 – 1.00  the logo holds (the crisp logo and tagline fade in on top)
 *
 * The fall keeps moving on its own while you pause, and scrolling faster
 * pushes the speed up. No post-processing; instanced geometry throughout.
 */

export const P = { dissolveStart: 0.68, dissolveEnd: 0.83, formEnd: 0.95 } as const;

/* Story time (seconds) used by the ember shader, mapped from scroll progress. */
const T = { dissolveStart: 2.2, dissolveEnd: 4.8, formStart: 4.8, formEnd: 7.4 } as const;
function storyTime(p: number) {
  if (p < P.dissolveStart) return (T.dissolveStart * p) / P.dissolveStart;
  if (p < P.dissolveEnd) return T.dissolveStart + ((p - P.dissolveStart) / (P.dissolveEnd - P.dissolveStart)) * (T.dissolveEnd - T.dissolveStart);
  if (p < P.formEnd) return T.formStart + ((p - P.dissolveEnd) / (P.formEnd - P.dissolveEnd)) * (T.formEnd - T.formStart);
  return T.formEnd + (p - P.formEnd) * 6;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How fast the world rushes past (0 → 1) at scroll progress p. */
function fallSpeed(p: number) {
  return (0.45 + 0.55 * smooth(0, 0.2, p)) * (1 - smooth(P.dissolveStart + 0.04, P.dissolveEnd + 0.1, p));
}

/* "Where it breaks first": the hot underside (leading face) goes first. Same on GPU and CPU. */
const NOISE_GLSL = /* glsl */ `
float dissolveField(vec3 p) {
  float n = 0.5 + 0.5 * sin(3.1 * p.x + 1.7) * sin(2.3 * p.y + 0.4) * sin(2.9 * p.z + 2.2);
  return clamp(0.78 * ((p.y + 1.0) * 0.5) + 0.22 * n, 0.0, 1.0);
}`;
const dissolveField = (x: number, y: number, z: number) => {
  const n = 0.5 + 0.5 * Math.sin(3.1 * x + 1.7) * Math.sin(2.3 * y + 0.4) * Math.sin(2.9 * z + 2.2);
  return Math.min(1, Math.max(0, 0.78 * ((y + 1) * 0.5) + 0.22 * n));
};

/** Ball spin: tumbling while it falls, settling just as it starts to break apart. */
function spin(t: number) {
  const k = Math.min(t, T.dissolveStart) / T.dissolveStart;
  const e = 1 - (1 - k) ** 2;
  return { x: 3.2 * e, y: 1.4 * e };
}

/** Samples points (and colours) from the logo SVG, rasterised once. */
async function sampleLogo(count: number): Promise<{ pos: Float32Array; col: Float32Array }> {
  const img = new Image();
  img.src = "/brand/slmga-logo-dark.svg";
  await img.decode();
  const W = 1200;
  const H = Math.round((W * 250) / 1806);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * n) * 2;
    const x = pts[k] + Math.random() * 2;
    const y = pts[k + 1] + Math.random() * 2;
    pos[i * 3] = x / W - 0.5;
    pos[i * 3 + 1] = (H / 2 - y) / W;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    const j = (Math.round(y) * W + Math.round(x)) * 4;
    col[i * 3] = data[j] / 255;
    col[i * 3 + 1] = data[j + 1] / 255;
    col[i * 3 + 2] = data[j + 2] / 255;
  }
  return { pos, col };
}

/** Soft cloud texture (drawn once): overlapping blurred puffs. */
function cloudTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 26; i++) {
    const x = 50 + Math.random() * 156;
    const y = 70 + Math.random() * 116;
    const r = 26 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Instanced quads positioned entirely on the GPU from a seed per instance. */
function instancedQuads(count: number, seed: (i: number) => [number, number, number, number]) {
  const base = new PlaneGeometry(1, 1);
  const g = new InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute("position", base.getAttribute("position"));
  g.setAttribute("uv", base.getAttribute("uv"));
  const s = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) s.set(seed(i), i * 4);
  g.setAttribute("aSeed", new InstancedBufferAttribute(s, 4));
  g.instanceCount = count;
  return g;
}

export interface BallSceneOptions {
  canvas: HTMLCanvasElement;
  /** Fewer particles and a lower resolution on phones / modest devices. */
  light: boolean;
  /** Moments for the sound to land on: smashing through a ring, starting to burn, the logo forming. */
  onEvent?: (e: "ring" | "burn" | "formed") => void;
}

export class BallScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(34, 1, 0.1, 120);
  private ball!: Mesh;
  private ballU = { uProg: { value: 0 }, uHeat: { value: 0 } };
  private sparkMat!: ShaderMaterial;
  private streakMat!: ShaderMaterial;
  private cloudMat!: ShaderMaterial;
  private emberMat!: ShaderMaterial;
  private trail!: Mesh;
  private trailMat!: ShaderMaterial;
  private rings: Mesh[] = [];
  private ringMat!: MeshBasicMaterial;
  private target = 0; // scroll progress asked for
  private p = 0; // smoothed progress
  private boost = 0; // extra speed from fast scrolling
  private fallen = 0; // distance fallen (drives everything rushing past)
  private clock = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private disposed = false;
  private visible = true;
  private bg = new Color(0, 0, 0);
  private lastP = 0;
  private ringY: number[] = [];

  constructor(private readonly opts: BallSceneOptions) {
    this.renderer = new WebGLRenderer({ canvas: opts.canvas, antialias: !opts.light, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.light ? 1.5 : 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.scene.background = new Color("#000000");
    this.camera.position.set(0, 0, 14);
  }

  async prepare() {
    const light = this.opts.light;
    const count = light ? 6000 : 12000;
    const logo = await sampleLogo(count);
    if (this.disposed) return;
    const pixel = this.renderer.getPixelRatio();

    /* ----- light */
    this.scene.add(new HemisphereLight("#dfe8ff", "#050505", 0.35));
    const key = new DirectionalLight("#fff3e0", 2.6);
    key.position.set(-4, 6, 6);
    const rim = new DirectionalLight("#cfe6ff", 3.2);
    rim.position.set(5, 2, -6);
    const fill = new DirectionalLight("#ffb46b", 0.9);
    fill.position.set(0, -6, 3);
    this.scene.add(key, rim, fill);

    /* ----- the ball: re-entry heat on its leading side, then a burning dissolve */
    const ballMat = new MeshStandardMaterial({ color: "#f2f4f3", roughness: 0.32, bumpMap: dimpleTexture(light ? 512 : 1024), bumpScale: 1.2 });
    ballMat.onBeforeCompile = (shader) => {
      shader.uniforms.uProg = this.ballU.uProg;
      shader.uniforms.uHeat = this.ballU.uHeat;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vDir;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDir = normalize(mat3(modelMatrix) * position);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec3 vDir;\nuniform float uProg;\nuniform float uHeat;\n${NOISE_GLSL}`)
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          // Heat builds on the face meeting the air (the underside).
          float hot = smoothstep(0.25, -0.95, vDir.y) * uHeat;
          diffuseColor.rgb *= 1.0 - 0.55 * hot;
          totalEmissiveRadiance += hot * mix(vec3(1.0, 0.28, 0.04), vec3(1.0, 0.8, 0.45), hot * hot) * 5.0;
          float f = dissolveField(vDir);
          if (f < uProg) discard;
          float edge = 1.0 - smoothstep(0.0, 0.03, f - uProg);
          totalEmissiveRadiance += edge * vec3(1.0, 0.8, 0.45) * 3.0 * step(0.0001, uProg);`,
        );
    };
    this.ball = new Mesh(new SphereGeometry(1, 96, 64), ballMat);
    this.scene.add(this.ball);

    /* ----- fiery trail streaming up behind the ball */
    this.trailMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uHeat: { value: 0 }, uClock: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uHeat;
        uniform float uClock;
        varying vec2 vUv;
        void main() {
          float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float along = vUv.y;               // 0 at the ball, 1 at the tail end
          float flicker = 0.85 + 0.15 * sin(uClock * 40.0 + along * 30.0);
          float a = pow(across, 2.2) * pow(1.0 - along, 1.6) * uHeat * flicker;
          vec3 c = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.35, 0.08), along);
          gl_FragColor = vec4(c, a * 0.9);
        }
      `,
    });
    this.trail = new Mesh(new PlaneGeometry(1.7, 7), this.trailMat);
    this.trail.geometry.translate(0, 3.5, -0.2);
    this.scene.add(this.trail);

    /* ----- air streaks rushing up past the ball */
    const streakCount = light ? 220 : 520;
    this.streakMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uFall: { value: 0 }, uSpeed: { value: 0 }, uFade: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uFall;
        uniform float uSpeed;
        attribute vec4 aSeed; // x, z, phase, rate
        varying vec2 vUv;
        varying float vA;
        void main() {
          vUv = uv;
          float span = 40.0;
          float y = mod(aSeed.z * span - uFall * (0.7 + aSeed.w * 0.9), span) - span * 0.5;
          float len = 0.2 + uSpeed * (2.5 + aSeed.w * 6.0);
          vec3 p = vec3(aSeed.x + position.x * (0.015 + aSeed.w * 0.03), y + position.y * len, aSeed.y);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = (0.25 + 0.6 * aSeed.w) * (0.2 + uSpeed) * smoothstep(-40.0, -4.0, mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uFade;
        varying vec2 vUv;
        varying float vA;
        void main() {
          float a = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y) * (1.0 - abs(vUv.x - 0.5) * 2.0);
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a * vA * uFade);
        }
      `,
    });
    const streaks = new Mesh(
      instancedQuads(streakCount, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 1.6 + Math.random() * 12;
        return [Math.cos(a) * r, Math.sin(a) * r * 0.9 - 2, Math.random(), Math.random()];
      }),
      this.streakMat,
    );
    streaks.frustumCulled = false;
    this.scene.add(streaks);

    /* ----- clouds tearing past, some right through the camera */
    const cloudCount = light ? 5 : 9;
    this.cloudMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: cloudTexture() }, uFall: { value: 0 }, uSpeed: { value: 0 }, uFade: { value: 1 }, uHeat: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uFall;
        uniform float uSpeed;
        attribute vec4 aSeed; // x, z, phase, size
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          float span = 70.0;
          float y = mod(aSeed.z * span - uFall * 1.3, span) - span * 0.5;
          float w = 14.0 + aSeed.w * 18.0;
          vec3 p = vec3(aSeed.x + position.x * w, y + position.y * w * (0.55 + uSpeed * 0.5), aSeed.y);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uFade;
        uniform float uHeat;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          float a = texture2D(uMap, vUv).a;
          // Lit faintly by the glowing ball from below, cooler further away.
          vec3 c = mix(vec3(0.32, 0.35, 0.42), vec3(0.75, 0.42, 0.22), uHeat * 0.5);
          float near = smoothstep(1.0, 6.0, vDepth); // fade as it passes the lens
          gl_FragColor = vec4(c, a * 0.28 * near * uFade);
        }
      `,
    });
    const clouds = new Mesh(
      instancedQuads(cloudCount, (i) => [(Math.random() - 0.5) * 30, -26 + (i / cloudCount) * 34 + Math.random() * 2, Math.random(), Math.random()]),
      this.cloudMat,
    );
    clouds.frustumCulled = false;
    this.scene.add(clouds);

    /* ----- rings of light the ball smashes through */
    this.ringMat = new MeshBasicMaterial({ color: new Color("#ffd98a").multiplyScalar(2.2), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 3; i++) {
      const ring = new Mesh(new TorusGeometry(2.6 + i * 0.3, 0.025, 8, 120), this.ringMat);
      ring.rotation.x = Math.PI / 2 - 0.25;
      this.rings.push(ring);
      this.scene.add(ring);
    }

    /* ----- embers: sparks shed by the hot ball (while falling), then the logo */
    const r0 = spin(T.dissolveStart);
    const rest = new Euler(r0.x, r0.y, 0);
    const start = new Float32Array(count * 3);
    const order = new Float32Array(count);
    const rand = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const w = new Vector3(r * Math.cos(a), u, r * Math.sin(a)).applyEuler(rest);
      start.set([w.x, w.y, w.z], i * 3);
      order[i] = dissolveField(w.x, w.y, w.z);
      rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(start, 3));
    g.setAttribute("aOrder", new BufferAttribute(order, 1));
    g.setAttribute("aRand", new BufferAttribute(rand, 4));
    g.setAttribute("aTarget", new BufferAttribute(logo.pos, 3));
    g.setAttribute("aColor", new BufferAttribute(logo.col, 3));
    this.sparkMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uClock: { value: 0 }, uBallScale: { value: 1 }, uLogoW: { value: 8 }, uPixel: { value: pixel }, uWind: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uClock;
        uniform float uBallScale;
        uniform float uLogoW;
        uniform float uPixel;
        uniform float uWind;
        attribute float aOrder;
        attribute vec4 aRand;
        attribute vec3 aTarget;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        float easeInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5; }
        void main() {
          float tBreak = ${T.dissolveStart.toFixed(2)} + aOrder * ${(T.dissolveEnd - T.dissolveStart).toFixed(2)};
          float age = max(0.0, uTime - tBreak);
          vec3 origin = position * uBallScale;
          // Torn off by the wind: streaming up and out, with a swirl.
          vec3 out1 = normalize(position + vec3(0.0, 0.4, 0.0));
          vec3 drift = origin + uBallScale * (
              out1 * (0.9 + aRand.x * 1.6) * (1.0 - exp(-age * 1.1))
            + vec3(0.0, (0.55 + 1.4 * uWind) * age, 0.0)
            + vec3(sin(age * 1.7 + aRand.y * 6.28), cos(age * 1.3 + aRand.z * 6.28), sin(age * 1.1 + aRand.w * 6.28)) * 0.25 * min(age, 1.5));
          float tForm = ${T.formStart.toFixed(2)} + aRand.x * 1.0;
          float k = easeInOut(clamp((uTime - tForm) / 1.6, 0.0, 1.0));
          vec3 target = aTarget * uLogoW + vec3(0.0, 0.15, sin(uClock * 2.0 + aRand.y * 20.0) * 0.02);
          vec3 p = mix(drift, target, k);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float broken = step(tBreak, uTime);
          float size = mix(0.09 + aRand.z * 0.09, 0.075, k);
          gl_PointSize = size * uPixel * (600.0 / -mv.z);
          vec3 ember = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.55, 0.2), aRand.w);
          vColor = mix(ember * (1.6 - 0.6 * min(age, 1.0)), aColor * 1.15, k);
          float twinkle = 0.75 + 0.25 * sin(uClock * 3.0 + aRand.x * 40.0);
          vAlpha = broken * mix(0.7 + 0.3 * exp(-age * 0.8), twinkle, k);
          vAlpha *= mix(1.0, 0.1, smoothstep(${T.formEnd.toFixed(2)}, ${(T.formEnd + 1.2).toFixed(2)}, uTime));
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, r);
          gl_FragColor = vec4(vColor, vAlpha * a * a);
        }
      `,
    });
    const sparks = new Points(g, this.sparkMat);
    sparks.frustumCulled = false;
    this.scene.add(sparks);

    /* ----- sparks shed continuously by the hot ball while it falls */
    const shedCount = light ? 260 : 600;
    const sg = new BufferGeometry();
    const sp = new Float32Array(shedCount * 3);
    const sr = new Float32Array(shedCount * 2);
    for (let i = 0; i < shedCount; i++) {
      const a = Math.random() * Math.PI * 2;
      sp.set([Math.cos(a), Math.random(), Math.sin(a)], i * 3);
      sr.set([Math.random(), Math.random()], i * 2);
    }
    sg.setAttribute("position", new BufferAttribute(sp, 3));
    sg.setAttribute("aRand", new BufferAttribute(sr, 2));
    this.emberMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uClock: { value: 0 }, uHeat: { value: 0 }, uSpeed: { value: 0 }, uPixel: { value: pixel }, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uClock;
        uniform float uHeat;
        uniform float uSpeed;
        uniform float uPixel;
        uniform float uScale;
        attribute vec2 aRand;
        varying float vA;
        varying float vT;
        void main() {
          // Each spark leaves the ball's rim and is blown up and outward, then fades.
          float life = fract(position.y + uClock * (0.6 + aRand.x * 0.9));
          vec3 rim = vec3(position.x, -0.3, position.z) * uScale;
          vec3 p = rim + vec3(position.x, 0.0, position.z) * life * (0.6 + aRand.y * 1.6) * uScale
                 + vec3(0.0, life * (3.0 + uSpeed * 9.0) * uScale, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.05 + aRand.y * 0.08) * (1.0 - life) * uPixel * (600.0 / -mv.z);
          vA = uHeat * (1.0 - life);
          vT = life;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying float vT;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          vec3 c = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.35, 0.08), vT);
          gl_FragColor = vec4(c, vA * smoothstep(0.5, 0.0, r));
        }
      `,
    });
    const shed = new Points(sg, this.emberMat);
    shed.frustumCulled = false;
    this.scene.add(shed);

    this.resize();
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* compiled on first frame instead */
    }
    this.draw();
  }

  /** Scroll progress through the hero (0 → 1). */
  setProgress(p: number) {
    const v = Math.min(1, Math.max(0, p));
    // Scrolling fast pushes the fall speed up for a moment.
    this.boost = Math.min(1.2, this.boost + Math.abs(v - this.target) * 14);
    this.target = v;
  }

  resize() {
    const c = this.opts.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const viewW = 2 * 14 /* the camera distance once the logo has formed */ * Math.tan((34 * Math.PI) / 360) * this.camera.aspect;
    if (this.sparkMat) this.sparkMat.uniforms.uLogoW.value = Math.min(9, viewW * (this.camera.aspect < 0.8 ? 0.88 : 0.78));
    const s = this.camera.aspect < 0.8 ? 0.75 : 1;
    this.ball?.scale.setScalar(s);
    this.trail?.scale.setScalar(s);
    if (this.sparkMat) this.sparkMat.uniforms.uBallScale.value = s;
    if (this.emberMat) this.emberMat.uniforms.uScale.value = s;
    if (!this.running && this.sparkMat) this.draw();
  }

  /** Where the logo sits on screen (px), so the crisp logo can be laid exactly over the particles. */
  logoRect() {
    const c = this.opts.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    const viewH = 2 * 14 /* the camera distance once the logo has formed */ * Math.tan((34 * Math.PI) / 360);
    const viewW = viewH * this.camera.aspect;
    const W = this.sparkMat ? this.sparkMat.uniforms.uLogoW.value : Math.min(9, viewW * 0.78);
    return { width: (W / viewW) * w, cy: h / 2 - (0.15 / viewH) * h };
  }

  /** Starts the render loop (it pauses itself while the hero is off-screen). */
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed || !this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.visible) this.step(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  setVisible(v: boolean) {
    this.visible = v;
  }

  /** Testing aid: draw one exact scroll position, with a given fall distance. */
  freeze(p: number, fallen = 30, clock = 3) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.target = this.p = p;
    this.fallen = fallen;
    this.clock = clock;
    this.boost = 0;
    this.draw();
  }

  private step(dt: number) {
    this.clock += dt;
    this.p += (this.target - this.p) * Math.min(1, dt * 7);
    this.boost *= Math.exp(-dt * 2.5);
    const speed = fallSpeed(this.p) * (1 + this.boost);
    this.fallen += dt * speed * 26;
    this.draw();
  }

  private draw() {
    const p = this.p;
    const t = storyTime(p);
    const speed = fallSpeed(p) * (1 + this.boost);
    const falling = 1 - smooth(P.dissolveStart, P.dissolveEnd + 0.08, p);
    const heat = smooth(0.1, 0.6, p) * (1 - smooth(P.dissolveStart + 0.1, P.dissolveEnd, p));

    /* camera: above the ball looking DOWN the fall (the air streaks converge on a
       point far below, like diving), shaking and widening the faster it goes;
       it levels out to face the logo as the fall ends. */
    const shake = speed * falling * 0.09;
    const c = this.clock;
    const tilt = falling;
    this.camera.position.set(Math.sin(c * 23.0) * shake + Math.sin(c * 7.3) * shake * 0.6, 4.2 * tilt + Math.cos(c * 19.0) * shake, 14 - 1.5 * tilt);
    this.camera.lookAt(0, -2.2 * tilt, 0);
    this.camera.rotateZ(Math.sin(c * 11.0) * shake * 0.05);
    this.camera.fov = 34 + 12 * speed * falling;
    this.camera.updateProjectionMatrix();

    /* the ball: tumbling and buffeted, settling as it burns */
    const r = spin(t);
    const settle = smooth(0.55, P.dissolveStart, p);
    this.ball.rotation.set(r.x + (1 - settle) * c * 2.2, r.y + (1 - settle) * c * 0.9, 0);
    const wobble = (1 - settle) * 0.08;
    // It drops into the frame from above at the very start of the scroll.
    const entry = 3.4 * (1 - smooth(0, 0.07, p)) * this.ball.scale.x;
    this.ball.position.set(Math.sin(c * 5.1) * wobble, entry + Math.cos(c * 4.3) * wobble, 0);
    this.ballU.uProg.value = Math.min(1.02, Math.max(0, (t - T.dissolveStart) / (T.dissolveEnd - T.dissolveStart)) * 1.02);
    this.ballU.uHeat.value = heat;
    this.ball.visible = this.ballU.uProg.value < 1;

    this.trail.position.copy(this.ball.position);
    this.trailMat.uniforms.uHeat.value = heat * (0.4 + 0.6 * speed);
    this.trailMat.uniforms.uClock.value = c;

    /* the world rushing past */
    this.streakMat.uniforms.uFall.value = this.fallen;
    this.streakMat.uniforms.uSpeed.value = speed * falling;
    this.streakMat.uniforms.uFade.value = 0.15 + 0.85 * falling;
    this.cloudMat.uniforms.uFall.value = this.fallen;
    this.cloudMat.uniforms.uSpeed.value = speed * falling;
    this.cloudMat.uniforms.uFade.value = falling;
    this.cloudMat.uniforms.uHeat.value = heat;

    // Rings: spaced out along the fall, rising past (and flashing as the ball goes through).
    let flash = 0;
    this.rings.forEach((ring, i) => {
      const span = 48;
      const y = ((((i / 3) * span - this.fallen * 0.9) % span) + span) % span - span / 2;
      ring.position.set(0, y, 0);
      ring.scale.setScalar(this.ball.scale.x);
      ring.visible = falling > 0.05;
      flash = Math.max(flash, 1 - Math.min(1, Math.abs(y - this.ball.position.y) / 1.4));
      // The ball goes through it (the ring rises past the ball).
      const prev = this.ringY[i];
      if (this.running && prev !== undefined && prev < this.ball.position.y && y >= this.ball.position.y && y - prev < 2 && falling > 0.3) this.opts.onEvent?.("ring");
      this.ringY[i] = y;
    });
    this.ringMat.opacity = 0.85 * falling;

    /* embers and the logo */
    this.sparkMat.uniforms.uTime.value = t;
    this.sparkMat.uniforms.uClock.value = c;
    this.sparkMat.uniforms.uWind.value = speed * falling;
    this.emberMat.uniforms.uClock.value = c;
    this.emberMat.uniforms.uHeat.value = heat * (1 - smooth(P.dissolveStart, P.dissolveStart + 0.08, p));
    this.emberMat.uniforms.uSpeed.value = speed;

    // Story moments, going forward.
    // (Skipped while jumping through big stretches at once, e.g. the Skip button.)
    const steady = Math.abs(p - this.lastP) < 0.03;
    if (this.running) {
      if (steady && this.lastP < P.dissolveStart && p >= P.dissolveStart) this.opts.onEvent?.("burn");
      if (this.lastP < P.formEnd - 0.02 && p >= P.formEnd - 0.02) this.opts.onEvent?.("formed");
    }
    this.lastP = p;

    // A warm flash lights the whole sky as the ball punches through a ring.
    this.bg.setRGB(0.05 * flash * falling, 0.035 * flash * falling, 0.015 * flash * falling);
    this.scene.background = this.bg;
    this.renderer.render(this.scene, this.camera);
  }

  /** 0 → 1 how fast the scene is falling right now (for the page's vignette). */
  get intensity() {
    return fallSpeed(this.p) * (1 - smooth(P.dissolveStart, P.dissolveEnd + 0.08, this.p));
  }

  /** What the sound follows each frame. */
  get audio() {
    const p = this.p;
    const falling = 1 - smooth(P.dissolveStart, P.dissolveEnd + 0.08, p);
    return {
      speed: fallSpeed(p) * (1 + this.boost) * falling,
      heat: smooth(0.1, 0.6, p) * (1 - smooth(P.dissolveStart + 0.1, P.dissolveEnd, p)),
      burn: smooth(P.dissolveStart - 0.01, P.dissolveStart + 0.04, p) * (1 - smooth(P.dissolveEnd - 0.05, P.dissolveEnd + 0.04, p)),
      gather: smooth(P.dissolveEnd, P.dissolveEnd + 0.06, p) * (1 - smooth(P.formEnd - 0.04, P.formEnd + 0.02, p)),
    };
  }

  get progress() {
    return this.p;
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material as (MeshStandardMaterial & ShaderMaterial) | undefined;
      mat?.bumpMap?.dispose();
      mat?.uniforms?.uMap?.value?.dispose?.();
      mat?.dispose?.();
    });
    this.renderer.dispose();
  }
}
