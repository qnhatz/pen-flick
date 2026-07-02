// RESUME: Session 1 — Static Scene. Replace MapScene's placeholder render
// with MapRenderer + UnitRenderer output driven by src/maps/map-01.json.
import { GameLoop } from './core/GameLoop';
import { SceneManager } from './core/SceneManager';
import { MapScene } from './scenes/MapScene';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context unavailable');

function resizeCanvas(): void {
  canvas.width = 960;
  canvas.height = 640;
}
resizeCanvas();

const scenes = new SceneManager();
scenes.goto(new MapScene());

const loop = new GameLoop((deltaMs) => {
  scenes.update(deltaMs);
  scenes.render(ctx);
});
loop.start();
