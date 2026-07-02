export type FrameCallback = (deltaMs: number) => void;

/** Thin requestAnimationFrame wrapper — nothing game-specific lives here. */
export class GameLoop {
  private running = false;
  private lastTime = 0;
  private rafId = 0;

  constructor(private readonly onFrame: FrameCallback) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (time: number): void => {
    if (!this.running) return;
    const deltaMs = time - this.lastTime;
    this.lastTime = time;
    this.onFrame(deltaMs);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
