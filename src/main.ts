// RESUME: Session 2 — Unit Selection & Radius Ring. Hit-test pointer/touch
// against unit entities in MapScene; on hold, draw a dashed range ring and
// swap HUD status text contextually (move vs. fire).
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
scenes.goto(new MapScene(container));

const loop = new GameLoop((deltaMs) => {
  scenes.update(deltaMs);
  scenes.render(ctx);
});
loop.start();
