import type { Scene } from '../core/SceneManager';
import { STYLE } from '../render/style';

/**
 * Smoke-test scene for Session 0 — confirms the loop/canvas/scene wiring
 * works end to end. Session 1 replaces the render body with MapRenderer +
 * UnitRenderer output driven by a loaded map JSON.
 */
export class MapScene implements Scene {
  enter(): void {}
  exit(): void {}
  update(_deltaMs: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = STYLE.paper;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = STYLE.ink;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lead Wars — Session 0 scaffold', width / 2, height / 2);
  }
}
