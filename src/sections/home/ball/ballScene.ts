import {
  AdditiveBlending,
  Euler,
  Vector3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  WebGLRenderer,
} from "three";
import { dimpleTexture } from "@/experience/materials/textures";

/**
 * The homepage opening scene: a golf ball falls slowly through the dark,
 * dissolves into glowing particles from the top down like embers, and the
 * particles drift, then gather into the SL Mini Golf Association logo.
 *
 * Time-based (seconds from start):
 *   0.0 – 2.6  the ball falls in, slowing as it arrives (speed dust streams up)
 *   2.2 – 4.8  it dissolves into particles, which drift up and outward
 *   4.8 – 7.4  the particles gather into the logo
 *   7.4 →      the logo holds, softly twinkling
 *
 * One mesh, two point clouds, no post-processing — light on the GPU.
 */

export const T = { fallEnd: 2.6, dissolveStart: 2.2, dissolveEnd: 4.8, formStart: 4.8, formEnd: 7.4 } as const;

const BALL_R = 1;

/* Same "where does it break first" field on the GPU (ball shader) and CPU (particles). */
const NOISE_GLSL = /* glsl */ `
float dissolveField(vec3 p) {
  float n = 0.5 + 0.5 * sin(3.1 * p.x + 1.7) * sin(2.3 * p.y + 0.4) * sin(2.9 * p.z + 2.2);
  return clamp(0.78 * (1.0 - (p.y + 1.0) * 0.5) + 0.22 * n, 0.0, 1.0);
}`;
const dissolveField = (x: number, y: number, z: number) => {
  const n = 0.5 + 0.5 * Math.sin(3.1 * x + 1.7) * Math.sin(2.3 * y + 0.4) * Math.sin(2.9 * z + 2.2);
  return Math.min(1, Math.max(0, 0.78 * (1 - (y + 1) * 0.5) + 0.22 * n));
};

/** 1 − field, so the TOP of the ball goes first (field is 0 at the top). Kept in one place. */
const breakOrder = (x: number, y: number, z: number) => dissolveField(x, y, z);

const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Spin: turns as it falls and comes smoothly to rest just as it starts to break apart. */
const SPIN = { x: 1.6, y: 0.8 };
function spin(t: number) {
  const k = Math.min(t, T.dissolveStart) / T.dissolveStart;
  const e = 1 - (1 - k) ** 2;
  return { x: SPIN.x * e, y: SPIN.y * e };
}

/** Ball height over time: drops in from above, slowing as it arrives, then a slow drift. */
function ballY(t: number) {
  if (t < T.fallEnd) return 8 * (1 - ease(t / T.fallEnd));
  return -0.25 * (t - T.fallEnd);
}

/** Samples points (and colours) from the logo SVG, rasterised once. */
async function sampleLogo(count: number): Promise<{ pos: Float32Array; col: Float32Array; aspect: number }> {
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
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * n) * 2;
    const x = pts[k] + Math.random() * 2;
    const y = pts[k + 1] + Math.random() * 2;
    // Centred, 1 unit = logo width.
    pos[i * 3] = x / W - 0.5;
    pos[i * 3 + 1] = (H / 2 - y) / W;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    const j = (Math.round(y) * W + Math.round(x)) * 4;
    col[i * 3] = data[j] / 255;
    col[i * 3 + 1] = data[j + 1] / 255;
    col[i * 3 + 2] = data[j + 2] / 255;
  }
  return { pos, col, aspect: W / H };
}

export interface BallSceneOptions {
  canvas: HTMLCanvasElement;
  /** Fewer particles and a lower resolution on phones. */
  light: boolean;
}

export class BallScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private ball!: Mesh;
  private ballMat!: MeshStandardMaterial;
  private ballUniforms = { uProg: { value: 0 } };
  private sparks!: Points;
  private sparkMat!: ShaderMaterial;
  private dust!: Points;
  private dustMat!: ShaderMaterial;
  private start = -1;
  private raf = 0;
  private disposed = false;
  private visible = true;

  constructor(private readonly opts: BallSceneOptions) {
    this.renderer = new WebGLRenderer({ canvas: opts.canvas, antialias: !opts.light, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.light ? 1.5 : 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.scene.background = new Color("#000000");
    this.camera.position.set(0, 0, 14);
  }

  async prepare() {
    const count = this.opts.light ? 6000 : 12000;
    const logo = await sampleLogo(count);
    if (this.disposed) return;

    /* ----- light */
    this.scene.add(new HemisphereLight("#dfe8ff", "#050505", 0.35));
    const key = new DirectionalLight("#fff3e0", 2.6);
    key.position.set(-4, 6, 6);
    const rim = new DirectionalLight("#cfe6ff", 3.2);
    rim.position.set(5, 2, -6);
    const fill = new DirectionalLight("#e3c27a", 0.6);
    fill.position.set(3, -4, 4);
    this.scene.add(key, rim, fill);

    /* ----- the ball, with a burning dissolve edge */
    this.ballMat = new MeshStandardMaterial({ color: "#f2f4f3", roughness: 0.32, metalness: 0, bumpMap: dimpleTexture(this.opts.light ? 512 : 1024), bumpScale: 1.2 });
    this.ballMat.onBeforeCompile = (shader) => {
      shader.uniforms.uProg = this.ballUniforms.uProg;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = normalize(mat3(modelMatrix) * position);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec3 vLocal;\nuniform float uProg;\n${NOISE_GLSL}`)
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float f = dissolveField(vLocal);
          if (f < uProg) discard;
          float edge = 1.0 - smoothstep(0.0, 0.03, f - uProg);
          totalEmissiveRadiance += edge * vec3(1.0, 0.8, 0.45) * 3.0 * step(0.0001, uProg);`,
        );
    };
    this.ball = new Mesh(new SphereGeometry(BALL_R, 96, 64), this.ballMat);
    this.scene.add(this.ball);

    /* ----- sparks: points on the ball surface that break away and become the logo */
    const r0 = spin(T.dissolveStart);
    const rest = new Euler(r0.x, r0.y, 0);
    const start = new Float32Array(count * 3);
    const order = new Float32Array(count);
    const rand = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Uniform point on the sphere.
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const x = r * Math.cos(a);
      const y = u;
      const z = r * Math.sin(a);
      // Where this surface point faces once the ball has stopped spinning.
      const w = new Vector3(x, y, z).applyEuler(rest);
      start[i * 3] = w.x;
      start[i * 3 + 1] = w.y;
      start[i * 3 + 2] = w.z;
      order[i] = breakOrder(w.x, w.y, w.z);
      rand[i * 4] = Math.random();
      rand[i * 4 + 1] = Math.random();
      rand[i * 4 + 2] = Math.random();
      rand[i * 4 + 3] = Math.random();
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
      uniforms: {
        uTime: { value: 0 },
        uBallScale: { value: 1 },
        uLogoW: { value: 8 },
        uPixel: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uBallScale;
        uniform float uLogoW;
        uniform float uPixel;
        attribute float aOrder;
        attribute vec4 aRand;
        attribute vec3 aTarget;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;

        float ease(float t) { return 1.0 - pow(1.0 - t, 3.0); }
        float easeInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5; }
        float ballY(float t) {
          return t < ${T.fallEnd.toFixed(2)} ? 8.0 * (1.0 - ease(t / ${T.fallEnd.toFixed(2)})) : -0.25 * (t - ${T.fallEnd.toFixed(2)});
        }

        void main() {
          // When this point breaks away from the ball.
          float tBreak = ${T.dissolveStart.toFixed(2)} + aOrder * ${(T.dissolveEnd - T.dissolveStart).toFixed(2)};
          float age = max(0.0, uTime - tBreak);
          vec3 origin = (position * ${BALL_R.toFixed(1)} + vec3(0.0, ballY(min(uTime, tBreak)), 0.0)) * uBallScale;

          // Drift: outward from the ball, rising like embers, with a gentle swirl.
          vec3 out1 = normalize(position + vec3(0.0, 0.6, 0.0));
          vec3 drift = origin + uBallScale * (
              out1 * (0.9 + aRand.x * 1.6) * (1.0 - exp(-age * 1.1))
            + vec3(0.0, 0.55 * age, 0.0)
            + vec3(sin(age * 1.7 + aRand.y * 6.28), cos(age * 1.3 + aRand.z * 6.28), sin(age * 1.1 + aRand.w * 6.28)) * 0.25 * min(age, 1.5));

          // Gather into the logo.
          float tForm = ${T.formStart.toFixed(2)} + aRand.x * 1.0;
          float k = easeInOut(clamp((uTime - tForm) / 1.6, 0.0, 1.0));
          vec3 target = aTarget * uLogoW + vec3(0.0, 0.15, 0.0);
          // Once formed: a faint shimmer in place.
          target += vec3(0.0, 0.0, sin(uTime * 2.0 + aRand.y * 20.0) * 0.02);
          vec3 p = mix(drift, target, k);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          float broken = step(tBreak, uTime);
          float size = mix(0.09 + aRand.z * 0.09, 0.075, k);
          gl_PointSize = size * uPixel * (600.0 / -mv.z);

          // Ember colours (white-hot → gold), turning into the logo's own colours.
          vec3 ember = mix(vec3(1.0, 0.95, 0.85), vec3(0.89, 0.76, 0.48), aRand.w);
          vColor = mix(ember * (1.6 - 0.6 * min(age, 1.0)), aColor * 1.15, k);
          float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + aRand.x * 40.0);
          vAlpha = broken * mix(0.7 + 0.3 * exp(-age * 0.8), twinkle, k);
          // Once the crisp logo has faded in on top, the particles settle back to a soft glitter.
          vAlpha *= mix(1.0, 0.35, smoothstep(${T.formEnd.toFixed(2)}, ${(T.formEnd + 1.2).toFixed(2)}, uTime));
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          float a = smoothstep(0.5, 0.0, r);
          gl_FragColor = vec4(vColor, vAlpha * a * a);
        }
      `,
    });
    this.sparks = new Points(g, this.sparkMat);
    this.sparks.frustumCulled = false;
    this.scene.add(this.sparks);

    /* ----- dust streaming upward while the ball falls (the sense of falling) */
    const dustCount = this.opts.light ? 300 : 700;
    const dpos = new Float32Array(dustCount * 3);
    const drand = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * 22;
      dpos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      dpos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      drand[i] = Math.random();
    }
    const dg = new BufferGeometry();
    dg.setAttribute("position", new BufferAttribute(dpos, 3));
    dg.setAttribute("aRand", new BufferAttribute(drand, 1));
    this.dustMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uRise: { value: 0 }, uSpeed: { value: 0 }, uPixel: { value: this.renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        uniform float uRise;
        uniform float uSpeed;
        uniform float uPixel;
        attribute float aRand;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + uRise * (0.6 + aRand), 16.0) - 8.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.2 + aRand * 1.8) * uPixel * (14.0 / -mv.z) * (1.0 + uSpeed * 3.0);
          vA = (0.15 + 0.35 * aRand) * (0.35 + uSpeed);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), vA * smoothstep(0.5, 0.0, r));
        }
      `,
    });
    this.dust = new Points(dg, this.dustMat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    this.resize();
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* compiled on first frame instead */
    }
    this.render(0);
  }

  resize() {
    const c = this.opts.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Fit the logo to ~78% of the view width (max 9 units on wide screens).
    const viewW = 2 * this.camera.position.z * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect;
    if (this.sparkMat) this.sparkMat.uniforms.uLogoW.value = Math.min(9, viewW * (this.camera.aspect < 0.8 ? 0.88 : 0.78));
    const s = this.camera.aspect < 0.8 ? 0.75 : 1;
    if (this.ball) this.ball.scale.setScalar(s);
    if (this.sparkMat) this.sparkMat.uniforms.uBallScale.value = s;
    if (this.start < 0 || this.elapsed() > T.formEnd) this.render(this.start < 0 ? 0 : this.elapsed());
  }

  /** Where the logo sits on screen (px), so the crisp logo can be laid exactly over the particles. */
  logoRect() {
    const c = this.opts.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    const viewH = 2 * this.camera.position.z * Math.tan((this.camera.fov * Math.PI) / 360);
    const viewW = viewH * this.camera.aspect;
    const W = this.sparkMat ? this.sparkMat.uniforms.uLogoW.value : Math.min(9, viewW * 0.78);
    return { width: (W / viewW) * w, cy: h / 2 - (0.15 / viewH) * h };
  }

  private elapsed() {
    return (performance.now() - this.start) / 1000;
  }

  /** Starts (or restarts) the sequence. */
  play(from = 0) {
    this.start = performance.now() - from * 1000;
    cancelAnimationFrame(this.raf);
    const loop = () => {
      if (this.disposed) return;
      const t = this.elapsed();
      // After the logo forms, keep the soft twinkle at a calmer frame rate.
      if (this.visible) this.render(t);
      this.raf = t > T.formEnd + 0.5 ? window.setTimeout(() => requestAnimationFrame(loop), 50) as unknown as number : requestAnimationFrame(loop);
    };
    loop();
  }

  /** Testing aid: stop the loop and draw one exact moment. */
  freeze(t: number) {
    this.disposed = true;
    this.render(t);
  }

  setVisible(v: boolean) {
    this.visible = v;
  }

  private render(t: number) {
    // Ball: falls in, spins slowly, dissolves.
    const s = this.ball.scale.x;
    this.ball.position.y = ballY(t) * s;
    const r = spin(t);
    this.ball.rotation.set(r.x, r.y, 0);
    this.ballUniforms.uProg.value = clamp01((t - T.dissolveStart) / (T.dissolveEnd - T.dissolveStart)) * 1.02;
    this.ball.visible = this.ballUniforms.uProg.value < 1;
    this.sparkMat.uniforms.uTime.value = t;

    // Dust: fast while falling, slowing to a float.
    const speed = t < T.fallEnd ? 1 - ease(t / T.fallEnd) * 0.85 : Math.max(0.05, 0.15 - (t - T.fallEnd) * 0.03);
    this.dustMat.uniforms.uSpeed.value = speed;
    this.dustMat.uniforms.uRise.value = t * 2.2 + 6 * ease(Math.min(1, t / T.fallEnd));

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.raf);
    this.scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material as MeshStandardMaterial | undefined;
      mat?.bumpMap?.dispose();
      mat?.dispose?.();
    });
    this.renderer.dispose();
  }
}
