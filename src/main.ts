// RESUME: Session 3 — Move Mechanic. On pointer drag from a held unit in
// move mode, draw a path line clamped to its moveRange ring; on release,
// animate the unit along that path and decrement movesRemaining.
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
