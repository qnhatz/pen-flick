/** Synthesized sound effects (no audio files) via the Web Audio API. */
export class AudioFx {
  private ctx: AudioContext | null = null;

  /** Call from inside a real user gesture (pointerdown/click) to satisfy autoplay policy. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  /** Pencil-skid flick — plays when a move/fire path is confirmed. */
  playSkid(): void {
    this.playTone(180, 55, 0.15, 'sawtooth', 0.12);
  }

  /** Ink line shooting across the paper — plays when a shot resolves. */
  playWhoosh(): void {
    this.playTone(600, 160, 0.25, 'sine', 0.08);
  }

  /** Noise burst — plays on a confirmed hit. */
  playBoom(): void {
    const ctx = this.ensureContext();
    const duration = 0.3;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType,
    gainPeak: number
  ): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + durationSec);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec + 0.05);
  }
}
