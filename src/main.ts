// RESUME: Session 4 — Shot Mechanic. When a held unit has no moves left
// (heldMode === 'fire'), wire pointer drag to an aim line clamped to
// shotRange; on release, resolve the trajectory against enemy bounding
// boxes and show a BOOM banner + hit flash on impact, or a fading miss mark.
import { GameLoop } from './core/GameLoop';
import { SceneManager } from './core/SceneManager';
import { MapScene } from './scenes/MapScene';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLDivElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context unavailable');

function resizeCanvas(): void {
  canvas.width = 960;
  canvas.height = 640;
}
resizeCanvas();

const scenes = new SceneManager();
scenes.goto(new MapScene(container, canvas));

const loop = new GameLoop((deltaMs) => {
  scenes.update(deltaMs);
  scenes.render(ctx);
});
loop.start();
