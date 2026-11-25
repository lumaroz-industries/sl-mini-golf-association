"use client";

/**
 * Sound for the homepage opening, synthesised with the Web Audio API (no
 * audio files to download): soft, cinematic and warm — airy swells, smooth
 * whooshes for the slash transitions, and crystal bells for the designer,
 * all through a gentle reverb.
 *
 * It starts by itself where the browser allows it. Browsers block sound
 * until the visitor has interacted with the site, so otherwise it starts on
 * the first tap or key press.
 */

/** When each sound plays, in seconds from the start of the intro (matches the CSS timeline). */
export const CUES: Array<{ at: number; play: (a: IntroAudio, t: number) => void }> = [
  // Act 1 — logo: a warm swell blooming as the logo appears, a soft bell on the light sweep.
  { at: 0.0, play: (a, t) => a.swell(t, [110, 164.81, 220], 1.6, 0.22) },
  { at: 0.35, play: (a, t) => a.bell(t, [880, 1318.5], 0.16) },
  // Slash 1.
  { at: 1.0, play: (a, t) => a.whoosh(t, 0.9, 0.32) },
  { at: 1.4, play: (a, t) => a.thud(t, 0.32) },
  // Slash 2.
  { at: 3.0, play: (a, t) => a.whoosh(t, 0.9, 0.34) },
  { at: 3.4, play: (a, t) => a.thud(t, 0.36) },
  // Act 3 — the designer: crystal bells, a shimmering pad and a glittering rise.
  { at: 3.45, play: (a, t) => a.swell(t, [261.63, 392, 523.25, 659.25], 3.6, 0.13) },
  { at: 3.55, play: (a, t) => a.arpeggio(t, [1318.5, 1567.98, 1975.53, 2637.02, 3135.96], 0.09, 0.15) },
  { at: 3.8, play: (a, t) => a.shimmer(t, 2.2, 0.32) },
  { at: 5.7, play: (a, t) => a.bell(t, [2093, 3135.96], 0.12) },
  { at: 6.4, play: (a, t) => a.swell(t, [523.25, 783.99, 1046.5], 1.6, 0.08) },
];

export class IntroAudio {
  readonly ctx: AudioContext;
  private dry: GainNode;
  private wet: GainNode;
  private master: GainNode;
  private noise: AudioBuffer;
  private scheduled = false;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(comp).connect(this.ctx.destination);

    // Soft hall reverb from a generated impulse response.
    const verb = this.ctx.createConvolver();
    const len = Math.round(this.ctx.sampleRate * 2.4);
    const ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    verb.buffer = ir;
    this.dry = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.45;
    this.dry.connect(this.master);
    this.wet.connect(verb).connect(this.master);

    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }

  get running() {
    return this.ctx.state === "running";
  }

  /** Plays every cue still ahead, given how far into the intro we are (seconds). Once only. */
  schedule(elapsed: number) {
    if (this.scheduled || this.ctx.state !== "running") return;
    this.scheduled = true;
    const now = this.ctx.currentTime + 0.03;
    for (const c of CUES) if (c.at >= elapsed - 0.1) c.play(this, now + Math.max(0, c.at - elapsed));
  }

  /** Lets everything ring out softly with the picture. */
  fadeOut(seconds = 1.2) {
    if (this.ctx.state === "closed") return;
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
    window.setTimeout(() => void this.ctx.close().catch(() => undefined), seconds * 1000 + 300);
  }

  /** Sends a voice to the dry and reverb buses. */
  private send(node: AudioNode, wet = 1) {
    node.connect(this.dry);
    const g = this.ctx.createGain();
    g.gain.value = wet;
    node.connect(g).connect(this.wet);
  }

  private envelope(t: number, peak: number, attack: number, release: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    return g;
  }

  /** A warm chord that blooms in and fades away (soft, slightly detuned). */
  swell(t: number, freqs: number[], dur: number, level: number) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.5);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = this.envelope(t, level, dur * 0.45, dur * 0.55);
    lp.connect(g);
    this.send(g, 1);
    for (const f of freqs)
      for (const detune of [-7, 7]) {
        const o = this.ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = detune;
        const v = this.ctx.createGain();
        v.gain.value = 1 / (freqs.length * 2);
        o.connect(v).connect(lp);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
  }

  /** A clear, soft bell. */
  bell(t: number, freqs: number[], level: number) {
    freqs.forEach((f, i) => {
      for (const [mult, amt] of [
        [1, 1],
        [2.76, 0.25],
        [5.4, 0.08],
      ] as const) {
        const o = this.ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f * mult;
        const g = this.envelope(t + i * 0.06, level * amt, 0.005, 1.6 / mult + 0.4);
        o.connect(g);
        this.send(g, 0.9);
        o.start(t + i * 0.06);
        o.stop(t + 2.6);
      }
    });
  }

  /** Crystal bells rising one after another. */
  arpeggio(t: number, freqs: number[], step: number, level: number) {
    freqs.forEach((f, i) => this.bell(t + i * step, [f], level * (1 - i * 0.08)));
  }

  /** Smooth air past the ear — the slash crossing the screen, left to right. */
  whoosh(t: number, dur: number, level: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.6;
    bp.frequency.setValueAtTime(220, t);
    bp.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.48);
    bp.frequency.exponentialRampToValueAtTime(380, t + dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + dur * 0.48);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(lp).connect(g);
    let out: AudioNode = g;
    if (this.ctx.createStereoPanner) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.7, t);
      pan.pan.linearRampToValueAtTime(0.7, t + dur);
      g.connect(pan);
      out = pan;
    }
    this.send(out, 0.6);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /** A soft, deep landing as the new scene appears. */
  thud(t: number, level: number) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.5);
    const g = this.envelope(t, level, 0.02, 0.8);
    o.connect(g);
    this.send(g, 0.5);
    o.start(t);
    o.stop(t + 1);
  }

  /** Glittering high notes, like light catching facets. */
  shimmer(t: number, dur: number, level: number) {
    const count = Math.round(dur * 12);
    for (let i = 0; i < count; i++) {
      const at = t + (dur * i) / count + Math.random() * 0.05;
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = [2637, 3135.96, 3520, 3951.07, 4698.63][Math.floor(Math.random() * 5)];
      const g = this.envelope(at, level * (0.04 + Math.random() * 0.05) * (1 - (0.5 * i) / count), 0.004, 0.5);
      let out: AudioNode = g;
      if (this.ctx.createStereoPanner) {
        const pan = this.ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        g.connect(pan);
        out = pan;
      }
      o.connect(g);
      this.send(out, 1);
      o.start(at);
      o.stop(at + 0.6);
    }
  }
}
