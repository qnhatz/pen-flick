// RESUME: Session 6 — Opponent AI. Replace MapScene's ENEMY_TURN_PLACEHOLDER_MS
// timeout (beginEnemyTurn/beginPlayerTurn) with an AIController that picks an
// enemy unit with budget remaining and issues a move/shot via the same
// MoveSystem/ShotSystem-shaped resolution path the player uses.
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
