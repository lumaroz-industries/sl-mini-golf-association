"use client";

/**
 * Sound for the falling-ball hero, synthesised with the Web Audio API and
 * driven by the scene every frame, so it follows your scroll:
 *   - wind that roars and brightens with the fall speed, and a deep rumble,
 *   - crackling heat while the ball glows like a meteor,
 *   - a whoosh + boom each time it smashes through a ring of light,
 *   - a sizzling burst as it burns apart, then the embers' shimmer,
 *   - a bright chime as the logo forms.
 *
 * Browsers only allow sound once the visitor has tapped or clicked on the
 * site (scrolling alone doesn't count); after that it plays by itself.
 */

export interface FallAudioState {
  speed: number;
  heat: number;
  burn: number;
  gather: number;
}

export class FallAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  private noise: AudioBuffer;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private rumbleGain!: GainNode;
  private crackleGain!: GainNode;
  private sizzleGain!: GainNode;
  private glitterGain!: GainNode;
  private started = false;
  private lastRing = 0;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp).connect(this.ctx.destination);
    const verb = this.ctx.createConvolver();
    const len = Math.round(this.ctx.sampleRate * 2.2);
    const ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    verb.buffer = ir;
    this.dry = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.35;
    this.dry.connect(this.master);
    this.wet.connect(verb).connect(this.master);
    this.noise = this.ctx.createBuffer(2, this.ctx.sampleRate * 3, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = this.noise.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
  }

  get running() {
    return this.ctx.state === "running";
  }

  private loop(): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start(0, Math.random() * 2);
    return s;
  }

  private send(node: AudioNode, wet = 0.5) {
    node.connect(this.dry);
    const g = this.ctx.createGain();
    g.gain.value = wet;
    node.connect(g).connect(this.wet);
  }

  /** Builds the continuous layers (once the browser allows sound). */
  private build() {
    if (this.started) return;
    this.started = true;
    // Wind: band-passed noise, brighter and louder with speed.
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.Q.value = 0.7;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.loop().connect(this.windFilter).connect(this.windGain);
    this.send(this.windGain, 0.25);
    // Rumble: low noise under everything.
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 110;
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.loop().connect(lp).connect(this.rumbleGain);
    this.send(this.rumbleGain, 0.1);
    // Crackle: high, gated noise — the heat.
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2600;
    const gate = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 23;
    const lfoAmt = this.ctx.createGain();
    lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt).connect(gate.gain);
    gate.gain.value = 0.5;
    lfo.start();
    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.value = 0;
    this.loop().connect(hp).connect(gate).connect(this.crackleGain);
    this.send(this.crackleGain, 0.3);
    // Sizzle: the burn-up.
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 5200;
    bp.Q.value = 0.8;
    this.sizzleGain = this.ctx.createGain();
    this.sizzleGain.gain.value = 0;
    this.loop().connect(bp).connect(this.sizzleGain);
    this.send(this.sizzleGain, 0.5);
    // Glitter: the embers gathering (a soft high pad).
    this.glitterGain = this.ctx.createGain();
    this.glitterGain.gain.value = 0;
    for (const f of [1567.98, 2093, 2637.02, 3135.96]) {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const trem = this.ctx.createOscillator();
      trem.frequency.value = 3 + Math.random() * 4;
      const tremAmt = this.ctx.createGain();
      tremAmt.gain.value = 0.5;
      const v = this.ctx.createGain();
      v.gain.value = 0.5;
      trem.connect(tremAmt).connect(v.gain);
      o.connect(v).connect(this.glitterGain);
      o.start();
      trem.start();
    }
    this.send(this.glitterGain, 0.9);
  }

  /** Tries to start; returns whether sound is now playing. */
  async unlock() {
    try {
      await this.ctx.resume();
    } catch {
      /* closed */
    }
    if (this.running) this.build();
    return this.running;
  }

  /** Follows the scene, every frame. `on` = the hero is on screen. */
  update(s: FallAudioState, on: boolean) {
    if (!this.started || !this.running) return;
    const now = this.ctx.currentTime;
    const k = 0.08; // smoothing
    this.master.gain.setTargetAtTime(on ? 0.8 : 0, now, 0.2);
    this.windGain.gain.setTargetAtTime(0.04 + 0.42 * s.speed, now, k);
    this.windFilter.frequency.setTargetAtTime(280 + 2600 * s.speed, now, k);
    this.rumbleGain.gain.setTargetAtTime(0.6 * s.speed, now, k);
    this.crackleGain.gain.setTargetAtTime(0.09 * s.heat, now, k);
    this.sizzleGain.gain.setTargetAtTime(0.16 * s.burn, now, k);
    this.glitterGain.gain.setTargetAtTime(0.03 * Math.max(s.gather, s.burn * 0.4), now, 0.2);
  }

  /** One-off moments. */
  event(e: "ring" | "burn" | "formed") {
    if (!this.started || !this.running) return;
    const t = this.ctx.currentTime + 0.01;
    if (e === "ring") {
      if (t - this.lastRing < 0.35) return;
      this.lastRing = t;
      this.whoosh(t, 0.55, 0.45);
      this.boom(t + 0.18, 0.5);
    } else if (e === "burn") {
      this.boom(t, 0.4);
      this.burst(t, 1.4, 0.35);
    } else {
      this.chime(t, [1046.5, 1318.51, 1567.98, 2093], 0.18);
    }
  }

  private env(t: number, peak: number, attack: number, release: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    return g;
  }

  private whoosh(t: number, dur: number, level: number) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(3500, t + dur * 0.5);
    bp.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = this.env(t, level, dur * 0.5, dur * 0.5);
    s.connect(bp).connect(g);
    this.send(g, 0.4);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.05);
  }

  private boom(t: number, level: number) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.6);
    const g = this.env(t, level, 0.01, 0.9);
    o.connect(g);
    this.send(g, 0.35);
    o.start(t);
    o.stop(t + 1.1);
  }

  private burst(t: number, dur: number, level: number) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(1200, t);
    hp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = this.env(t, level, 0.02, dur);
    s.connect(hp).connect(g);
    this.send(g, 0.7);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.1);
  }

  private chime(t: number, freqs: number[], level: number) {
    freqs.forEach((f, i) => {
      for (const [mult, amt] of [
        [1, 1],
        [2.76, 0.22],
      ] as const) {
        const o = this.ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f * mult;
        const g = this.env(t + i * 0.07, level * amt, 0.005, 2.2 / mult);
        o.connect(g);
        this.send(g, 0.9);
        o.start(t + i * 0.07);
        o.stop(t + 3);
      }
    });
  }

  dispose() {
    void this.ctx.close().catch(() => undefined);
  }
}
