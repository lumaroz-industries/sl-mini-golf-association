"use client";

/**
 * Sound for the homepage opening, synthesised with the Web Audio API (no
 * audio files to download). Browsers only allow sound after the visitor has
 * interacted with the page, so it starts from the "Sound" button — or by
 * itself where the browser already allows it.
 */

/** When each sound plays, in seconds from the start of the intro (matches the CSS timeline). */
export const CUES: Array<{ at: number; play: (a: IntroAudio, t: number) => void }> = [
  { at: 0.05, play: (a, t) => a.boom(t, 0.5) },
  { at: 0.35, play: (a, t) => a.shimmer(t, 0.9, 0.5) },
  { at: 1.0, play: (a, t) => a.whoosh(t, 0.8) },
  { at: 1.4, play: (a, t) => a.boom(t, 0.7) },
  { at: 1.75, play: (a, t) => a.ping(t, [523.25, 784, 1046.5], 0.5) }, // gold: warm major chord
  { at: 2.55, play: (a, t) => a.whoosh(t, 0.8) },
  { at: 2.95, play: (a, t) => a.boom(t, 0.8) },
  { at: 3.3, play: (a, t) => a.ping(t, [1318.5, 1975.5, 2637, 3951], 0.45) }, // diamond: high crystal
  { at: 3.45, play: (a, t) => a.shimmer(t, 1.4, 0.6) },
  { at: 4.95, play: (a, t) => a.shimmer(t, 0.8, 0.45) },
];

export class IntroAudio {
  readonly ctx: AudioContext;
  private out: GainNode;
  private noise: AudioBuffer;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.55;
    this.out.connect(comp).connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  get running() {
    return this.ctx.state === "running";
  }

  /** Plays every cue still ahead, given how far into the intro we are (seconds). */
  schedule(elapsed: number) {
    const now = this.ctx.currentTime;
    for (const c of CUES) if (c.at >= elapsed - 0.05) c.play(this, now + Math.max(0, c.at - elapsed));
  }

  fadeOut(seconds = 0.6) {
    const g = this.out.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(0, this.ctx.currentTime + seconds);
    window.setTimeout(() => void this.ctx.close().catch(() => undefined), seconds * 1000 + 200);
  }

  private env(t: number, peak: number, attack: number, release: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    return g;
  }

  /** Air rushing past — the slash crossing the screen, panning left to right. */
  whoosh(t: number, dur: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(250, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.5);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let chain: AudioNode = g;
    if (this.ctx.createStereoPanner) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.8, t);
      pan.pan.linearRampToValueAtTime(0.8, t + dur);
      g.connect(pan);
      chain = pan;
    }
    src.connect(bp).connect(g);
    chain.connect(this.out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /** A deep cinematic hit. */
  boom(t: number, level: number) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    const g = this.env(t, level, 0.01, 0.9);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 1);
    // The transient on top.
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "lowpass";
    hp.frequency.value = 1800;
    const ng = this.env(t, level * 0.35, 0.003, 0.12);
    n.connect(hp).connect(ng).connect(this.out);
    n.start(t, Math.random());
    n.stop(t + 0.2);
  }

  /** A bright metallic chord (gold, or high crystal for diamond). */
  ping(t: number, freqs: number[], level: number) {
    freqs.forEach((f, i) => {
      for (const detune of [-4, 4]) {
        const o = this.ctx.createOscillator();
        o.type = i === 0 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = detune;
        const g = this.env(t + i * 0.025, (level / freqs.length) * 0.9, 0.006, 1.8 - i * 0.2);
        o.connect(g).connect(this.out);
        o.start(t + i * 0.025);
        o.stop(t + 2.2);
      }
    });
  }

  /** Tiny glints of light — a scatter of very high, very short notes. */
  shimmer(t: number, dur: number, level: number) {
    const count = Math.round(dur * 18);
    for (let i = 0; i < count; i++) {
      const at = t + (dur * i) / count + Math.random() * 0.03;
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 2400 + Math.random() * 3600;
      const g = this.env(at, level * (0.05 + Math.random() * 0.06), 0.004, 0.18 + Math.random() * 0.2);
      if (this.ctx.createStereoPanner) {
        const pan = this.ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        o.connect(g).connect(pan).connect(this.out);
      } else o.connect(g).connect(this.out);
      o.start(at);
      o.stop(at + 0.5);
    }
  }
}
