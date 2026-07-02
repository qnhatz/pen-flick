export interface Scene {
  enter(): void;
  exit(): void;
  update(deltaMs: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

/** Swaps the active scene (menu / map / game-over) without the game loop knowing which. */
export class SceneManager {
  private current: Scene | null = null;

  goto(scene: Scene): void {
    this.current?.exit();
    this.current = scene;
    this.current.enter();
  }

  update(deltaMs: number): void {
    this.current?.update(deltaMs);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.current?.render(ctx);
  }
}
