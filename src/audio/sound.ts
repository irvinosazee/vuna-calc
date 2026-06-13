import { noteToFreq } from './notes';

const MASTER_VOL = 0.5;

/**
 * WebAudio ambience: a soft synthesized pad (started on first unmute), a short
 * chime when a course card opens, and a filtered-noise rustle during the climb.
 * One lazily-created AudioContext (autoplay policy needs a user gesture); a
 * master gain implements mute. All methods no-op safely when muted or when no
 * AudioContext is available (headless/SSR).
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;

  constructor(startMuted: boolean) {
    this.muted = startMuted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Toggle mute. Call from a user gesture — first unmute builds the graph. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!muted) this.ensure();
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, this.ctx.currentTime, 0.12);
    }
  }

  chime(): void {
    const ctx = this.active();
    if (!ctx) return;
    const now = ctx.currentTime;
    [7, 11, 14].forEach((semi, i) => {
      // a rising E–G#–B-ish arpeggio above A4
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = noteToFreq(semi);
      const t0 = now + i * 0.08;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      o.connect(g);
      g.connect(this.master!);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
  }

  rustle(): void {
    const ctx = this.active();
    if (!ctx) return;
    const dur = 0.45;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); // decaying noise
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    src.start();
  }

  /** AudioContext if usable and unmuted, else null. */
  private active(): AudioContext | null {
    return this.muted || !this.ctx || !this.master ? null : this.ctx;
  }

  private ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOL;
    this.master.connect(ctx.destination);

    // Ambient pad: detuned saws → lowpass, with a slow LFO breathing the gain.
    const pad = ctx.createGain();
    pad.gain.value = 0.1;
    pad.connect(this.master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;
    filter.connect(pad);
    for (const f of [110, 110 * 1.005, 164.81]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(pad.gain);
    lfo.start();
  }
}
