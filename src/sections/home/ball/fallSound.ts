"use client";

/**
 * Sound for the falling-ball hero, synthesised with the Web Audio API and
 * driven by the scene every frame, so it follows your scroll:
 *   - wind made from deep "brown" noise: a roar that opens up with speed,
 *     slow gusts, a howling whistle that rises, and a deep rumble,
 *   - a low fire roar while the ball glows like a meteor,
 *   - a whoosh + boom each time it smashes through a ring of light,
 *   - a burst as it burns apart, then the embers' shimmer,
 *   - silence once the logo has formed.
 *
 * Browsers only allow sound once the visitor has tapped or clicked on the
 * site (scrolling alone doesn't count); after that it plays by itself.
 */

export interface FallAudioState {
  speed: number;
  heat: number;
  burn: number;
  gather: number;
  /** The logo has formed: everything fades to silence. */
  formed?: boolean;
}

export class FallAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  private noise: AudioBuffer;
  /** Deep, soft noise (most energy in the lows) — sounds like wind, not hiss. */
  private brown: AudioBuffer;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private rumbleGain!: GainNode;
  private fireGain!: GainNode;
  private howlGain!: GainNode;
  private howlFilter!: BiquadFilterNode;
  private sizzleGain!: GainNode;
  private glitterGain!: GainNode;
  private started = false;
  private lastRing = 0;
  private lastBurn = -10;
  /** The visitor's Sound on/off choice. */
  enabled = true;

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
    this.brown = this.ctx.createBuffer(2, this.ctx.sampleRate * 4, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = this.brown.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }

  get running() {
    return this.ctx.state === "running";
  }

  private loop(buffer: AudioBuffer = this.brown): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
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

  /** A slow wobble for gusts (sine LFO added onto a parameter). */
  private lfo(target: AudioParam, rate: number, depth: number) {
    const o = this.ctx.createOscillator();
    o.frequency.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
  }

  /** Builds the continuous layers (once the browser allows sound). */
  private build() {
    if (this.started) return;
    this.started = true;
    // Wind roar: brown noise through a low-pass that opens with speed; slow gusts.
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.Q.value = 1.4;
    this.windFilter.frequency.value = 300;
    this.lfo(this.windFilter.frequency, 0.23, 120);
    const gust = this.ctx.createGain();
    gust.gain.value = 1;
    this.lfo(gust.gain, 0.17, 0.25);
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.loop().connect(this.windFilter).connect(gust).connect(this.windGain);
    this.send(this.windGain, 0.2);
    // Howl: a narrow, resonant band that rises with speed and wavers — the whistle of air.
    this.howlFilter = this.ctx.createBiquadFilter();
    this.howlFilter.type = "bandpass";
    this.howlFilter.Q.value = 9;
    this.howlFilter.frequency.value = 420;
    this.lfo(this.howlFilter.frequency, 0.31, 60);
    this.howlGain = this.ctx.createGain();
    this.howlGain.gain.value = 0;
    this.loop().connect(this.howlFilter).connect(this.howlGain);
    this.send(this.howlGain, 0.4);
    // Rumble: the very lowest part, felt more than heard.
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 90;
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.loop().connect(lp).connect(this.rumbleGain);
    this.send(this.rumbleGain, 0.1);
    // Fire roar: low, fluttering — the meteor's heat.
    const fl = this.ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = 650;
    const flutter = this.ctx.createGain();
    flutter.gain.value = 1;
    this.lfo(flutter.gain, 8.5, 0.3);
    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.value = 0;
    this.loop().connect(fl).connect(flutter).connect(this.fireGain);
    this.send(this.fireGain, 0.3);
    // Burn-up: a soft, mid "whoomp" of fire (no hiss).
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.7;
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
      const v = this.ctx.createGain();
      v.gain.value = 0.5;
      this.lfo(v.gain, 3 + Math.random() * 4, 0.5);
      o.connect(v).connect(this.glitterGain);
      o.start();
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
    const k = 0.2; // smoothing: no sudden jumps, even when scrolling fast
    const audible = on && this.enabled && !s.formed;
    this.master.gain.setTargetAtTime(audible ? 0.8 : 0, now, s.formed ? 0.35 : this.enabled ? 0.2 : 0.06);
    // Fast scrolling can push the speed past 1: compress it so the wind never overloads.
    const sp = Math.min(1, Math.tanh(s.speed * 1.2) / Math.tanh(1.2));
    this.windGain.gain.setTargetAtTime(0.08 + 0.55 * sp, now, k);
    this.windFilter.frequency.setTargetAtTime(260 + 1000 * sp, now, 0.3);
    this.howlGain.gain.setTargetAtTime(0.22 * sp * sp, now, k);
    this.howlFilter.frequency.setTargetAtTime(380 + 480 * sp, now, 0.35);
    this.rumbleGain.gain.setTargetAtTime(0.5 * sp, now, k);
    this.fireGain.gain.setTargetAtTime(0.35 * s.heat, now, k);
    this.sizzleGain.gain.setTargetAtTime(0.22 * s.burn, now, k);
    this.glitterGain.gain.setTargetAtTime(0.03 * Math.max(s.gather, s.burn * 0.4), now, 0.2);
  }

  /** One-off moments. */
  event(e: "ring" | "burn" | "formed") {
    if (!this.started || !this.running || !this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    // Each sound needs a breather before it can play again (no pile-ups on fast scrolls).
    if (e === "ring") {
      if (t - this.lastRing < 0.7) return;
      this.lastRing = t;
      this.whoosh(t, 0.55, 0.4);
      this.boom(t + 0.18, 0.42);
    } else if (e === "burn") {
      if (t - this.lastBurn < 2.5) return;
      this.lastBurn = t;
      this.boom(t, 0.36);
      this.burst(t, 1.4, 0.3);
    }
    // "formed": the logo appears in silence (the fall's sound fades out in update()).
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
    s.buffer = this.brown;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "lowpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(250, t);
    bp.frequency.exponentialRampToValueAtTime(1600, t + dur * 0.5);
    bp.frequency.exponentialRampToValueAtTime(200, t + dur);
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
    s.buffer = this.brown;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "lowpass";
    hp.frequency.setValueAtTime(2200, t);
    hp.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = this.env(t, level, 0.02, dur);
    s.connect(hp).connect(g);
    this.send(g, 0.7);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.1);
  }

  dispose() {
    void this.ctx.close().catch(() => undefined);
  }
}
