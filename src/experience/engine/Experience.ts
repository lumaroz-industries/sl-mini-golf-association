import {
  ACESFilmicToneMapping,
  Color,
  HalfFloatType,
  Matrix4,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type Material,
  type Mesh,
  type Texture,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildCoursePath, type CoursePath } from "../course/path";
import { buildWorld, EMERALD, type World, type WorldText } from "../course/buildWorld";
import { createBall, createPutter } from "../actors/actors";
import { BallMotion, type BallState } from "../timeline/ballMotion";
import { createShots, type CameraPose, type ShotList } from "../camera/shots";
import { P, P_IMPACT, smoothstep } from "../timeline/chapters";
import type { QualitySettings } from "../quality";

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  quality: QualitySettings;
  text: WorldText;
  /** Called right after a frame is drawn, at most every few hundred ms (for a still copy). */
  onFrame?: (canvas: HTMLCanvasElement) => void;
}

const DIM = new Color("#05130d");
const LIT = EMERALD.clone().multiplyScalar(2.4);

/**
 * The homepage 3D experience. Fixed presentation code — not CMS-driven.
 * Renders only when scroll progress (or the viewport) changes, so a
 * stationary page costs nothing and the frame holds exactly where it is.
 */
export class Experience {
  private renderer: WebGLRenderer;
  private composer?: EffectComposer;
  private bloom?: UnrealBloomPass;
  private scene = new Scene();
  private camera = new PerspectiveCamera(40, 1, 0.005, 900);
  private path: CoursePath;
  private motion: BallMotion;
  private world: World;
  private shots: ShotList;
  private ball: ReturnType<typeof createBall>;
  private putter: ReturnType<typeof createPutter>;
  private state: BallState = { s: 0, position: new Vector3(), quaternion: new Quaternion(), drop: 0 };
  private pose: CameraPose = { pos: new Vector3(), look: new Vector3(), fov: 40 };
  private progress = 0;
  private dirty = true;
  private raf = 0;
  private envTexture?: Texture;
  private disposed = false;
  /* Adaptive resolution: average time between frames while the scene is moving. */
  private lastFrame = 0;
  private frameAvg = 16;
  private slowFrames = 0;
  private pixelRatio = 1;
  private lastStill = 0;

  constructor(private readonly opts: ExperienceOptions) {
    const { canvas, quality } = opts;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: !quality.bloom,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
    });
    this.pixelRatio = Math.min(window.devicePixelRatio, quality.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.background = new Color("#020403");

    // The soft environment light is added just after the first frame (see
    // prepare), so it doesn't delay the course appearing.
    this.scene.environmentIntensity = 0.14;

    this.path = buildCoursePath();
    this.motion = new BallMotion(this.path);
    const compact = canvas.clientHeight > canvas.clientWidth * 1.15;
    this.world = buildWorld(this.scene, this.path, quality, { ...opts.text, compact }, this.motion.sGate, this.motion.sArch);
    this.ball = createBall(quality.textureSize);
    this.scene.add(this.ball.mesh, this.ball.shadow);
    this.putter = createPutter(this.path, this.motion.sStart);
    this.scene.add(this.putter.root);
    this.shots = createShots(this.path, this.motion, this.world);

    if (quality.bloom) {
      const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: quality.msaa });
      this.composer = new EffectComposer(this.renderer, target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 0.82);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /**
   * Gets the scene ready to show: shaders are compiled in parallel where the
   * browser supports it (instead of freezing the page on the first frame),
   * then the environment light is prepared once the course is on screen.
   */
  async prepare(): Promise<void> {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* compiled on first render instead */
    }
    if (this.disposed) return;
    const addEnvironment = () => {
      if (this.disposed) return;
      const pmrem = new PMREMGenerator(this.renderer);
      this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      this.scene.environment = this.envTexture;
      this.dirty = true;
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(addEnvironment, { timeout: 600 });
    else setTimeout(addEnvironment, 120);
  }

  setProgress(p: number) {
    const clamped = Math.min(1, Math.max(0, p));
    if (clamped !== this.progress) {
      this.progress = clamped;
      this.dirty = true;
    }
  }

  resize() {
    const canvas = this.opts.canvas;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.dirty = true;
  }

  /** Renders a frame immediately (used for the first frame and screenshots). */
  renderNow() {
    this.update(this.progress);
    this.render();
    this.dirty = false;
  }

  private loop(time: number) {
    if (this.disposed) return;
    if (this.dirty) {
      this.renderNow();
      this.adapt(time);
      if (this.opts.onFrame && time - this.lastStill > 350) {
        this.lastStill = time;
        this.opts.onFrame(this.opts.canvas);
      }
    } else this.lastFrame = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  /**
   * If frames keep taking too long while scrolling, render at a lower
   * resolution. Very heavy frames can make the browser's graphics give up
   * (the 3D view drops out), so this keeps the device within its limits.
   */
  private adapt(time: number) {
    if (this.lastFrame) {
      const dt = Math.min(250, time - this.lastFrame);
      this.frameAvg += (dt - this.frameAvg) * 0.1;
      this.slowFrames = this.frameAvg > 42 ? this.slowFrames + 1 : 0;
      if (this.slowFrames > 20 && this.pixelRatio > 0.75) {
        this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.resize();
        this.slowFrames = 0;
        this.frameAvg = 30;
      }
    }
    this.lastFrame = time;
  }

  private render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private update(p: number) {
    const { world, motion, path, state, ball } = this;

    /* ball */
    motion.stateAt(p, state);
    ball.mesh.position.copy(state.position);
    ball.mesh.quaternion.copy(state.quaternion);
    const f = path.frameAt(state.s);
    const surface = motion.surfacePoint(Math.min(state.s, motion.sCup), new Vector3());
    ball.shadow.position.copy(surface).addScaledVector(f.U, 0.0012);
    ball.shadow.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(f.R, f.T, f.U));
    ball.shadowMat.opacity = 0.85 * (1 - smoothstep(0, 0.35, state.drop));

    /* putter */
    this.putter.update(p);

    /* camera */
    const portrait = this.camera.aspect < 0.85;
    const reach = portrait ? 1.35 : 1;
    this.shots.pose(p, { path, motion, world, ball: state, reach }, this.pose);
    this.camera.position.copy(this.pose.pos);
    this.camera.fov = this.pose.fov + (portrait ? 12 : 0);
    this.camera.lookAt(this.pose.look);
    this.camera.updateProjectionMatrix();

    /* lighting: lit from the first frame (no dark start), brightening into the finale */
    const emeraldIn = smoothstep(0, 0.025, p) * 0.2 + 0.8;
    const envIn = smoothstep(0.012, 0.06, p) * 0.25 + 0.75;
    const finale = smoothstep(P.dropEnd, P.dropEnd + 0.05, p);
    world.hemi.intensity = 0.06 + 0.5 * envIn + 0.5 * finale;
    world.key.intensity = 1.4 * envIn + 0.6 * finale;
    world.hallSpot.intensity = 14 * (0.75 + 0.25 * smoothstep(0.02, 0.07, p));
    world.wallGlow.intensity = 45 * emeraldIn;
    world.greenSpot.intensity = 30 * smoothstep(P.obstaclesEnd - 0.04, P.obstaclesEnd + 0.04, p);
    world.hallEmissive[0].color.copy(EMERALD).multiplyScalar(2.6 * emeraldIn);
    world.hallEmissive[1].color.set("#dff5ec").multiplyScalar(1.4 * envIn);
    // Wall typography leads the reveal, then steps back as the hero overlay arrives.
    const handoff = 1 - 0.9 * smoothstep(P.revealEnd - 0.008, P.revealEnd + 0.012, p);
    world.hallText[0].opacity = (0.7 + 0.3 * smoothstep(0.01, 0.05, p)) * handoff;
    world.hallText[1].opacity = 0.9 * (0.7 + 0.3 * smoothstep(0.02, 0.07, p)) * handoff;
    world.stars.opacity = 0.7 * envIn;

    // Keep the shadow camera on the action.
    world.key.target.position.copy(this.pose.look);
    world.key.position.copy(this.pose.look).add(new Vector3(4, 9, 3));

    /* light trail along the rails follows the ball, then the whole course lights up */
    const trail = p < P_IMPACT ? motion.sStart : state.s;
    const reveal = trail + (path.length + 3 - trail) * finale;
    world.ledMaterial.uniforms.uReveal.value = reveal;

    const c = new Color();
    world.tunnelRingS.forEach((s, k) => {
      const lit = 1 - smoothstep(reveal - 0.1, reveal + 1.0, s);
      world.tunnelRings.setColorAt(k, c.copy(DIM).lerp(LIT, lit));
    });
    world.tunnelRings.instanceColor!.needsUpdate = true;
    world.tunnelText.forEach((m, k) => {
      const sText = path.segStart.tunnel + (path.segEnd.tunnel - path.segStart.tunnel) * (k === 0 ? 0.3 : 0.62);
      m.opacity = 0.12 + 0.88 * (1 - smoothstep(reveal - 0.2, reveal + 1.4, sText));
    });
    world.bollardS.forEach((s, k) => {
      const passed = 1 - smoothstep(reveal - 0.3, reveal + 0.6, s);
      const wave = smoothstep(P.dropEnd + (s / path.length) * 0.05, P.dropEnd + 0.01 + (s / path.length) * 0.05, p);
      world.bollardCaps.setColorAt(k, c.copy(DIM).lerp(new Color("#dff5ec").multiplyScalar(1.8), Math.max(passed * 0.55, wave)));
    });
    world.bollardCaps.instanceColor!.needsUpdate = true;

    /* obstacles & water — all functions of progress, so they reverse too */
    const pGate = motion.pAt(motion.sGate);
    world.gateRotor.rotation.z = Math.PI / 4 + (p - pGate) * 38;
    const bump = world.water.bumpMap;
    if (bump) bump.offset.set(p * 2.2, p * 0.6);

    /* the cup: light rises from the hole as the ball drops */
    const burst = smoothstep(P.greenEnd + 0.01, P.dropEnd, p);
    const afterglow = 1 - 0.55 * smoothstep(P.dropEnd + 0.03, 1, p);
    world.cupLight.intensity = 1.6 * burst * afterglow;
    world.cupGlow.color.copy(EMERALD).multiplyScalar(0.4 + 3.2 * burst);
    world.beam.uniforms.uIntensity.value = 0.9 * burst * afterglow;
    world.ledMaterial.uniforms.uOn.value.copy(EMERALD).multiplyScalar(3.2 + 2.2 * finale);
    world.finaleText.opacity = 0.08 + 0.92 * finale;

    if (this.bloom) this.bloom.strength = 0.5 + 0.25 * finale;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      mesh.geometry?.dispose();
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      mats.forEach((m: Material) => {
        for (const value of Object.values(m)) if (value && (value as Texture).isTexture) (value as Texture).dispose();
        m.dispose();
      });
    });
    this.envTexture?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
