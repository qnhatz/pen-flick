import { STYLE } from './style';
import type { MapData, TerrainFeature, ObstacleFeature } from '../maps/types';

/** Deterministic PRNG so hand-drawn wobble is stable across re-renders of the same map. */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function offsetPolyline(points: [number, number][], dist: number): [number, number][] {
  return points.map((point, i) => {
    const prev = points[i - 1] ?? point;
    const next = points[i + 1] ?? point;
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return [point[0] + nx * dist, point[1] + ny * dist] as [number, number];
  });
}

function drawWobblyLine(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  seed: number,
  jitter = 2.5
): void {
  const rand = seededRandom(seed);
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const jx = (rand() - 0.5) * jitter;
    const jy = (rand() - 0.5) * jitter;
    if (i === 0) ctx.moveTo(x + jx, y + jy);
    else ctx.lineTo(x + jx, y + jy);
  });
  ctx.stroke();
}

function drawRoad(ctx: CanvasRenderingContext2D, terrain: TerrainFeature, seed: number): void {
  const half = terrain.width / 2;
  const left = offsetPolyline(terrain.points, half);
  const right = offsetPolyline(terrain.points, -half);

  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawWobblyLine(ctx, left, seed);
  drawWobblyLine(ctx, right, seed + 1);

  // Dashed centerline.
  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  terrain.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

function drawRiver(ctx: CanvasRenderingContext2D, terrain: TerrainFeature, seed: number): void {
  const half = terrain.width / 2;
  const left = offsetPolyline(terrain.points, half);
  const right = offsetPolyline(terrain.points, -half).reverse();

  ctx.fillStyle = 'rgba(150, 195, 220, 0.35)';
  ctx.beginPath();
  [...left, ...right].forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawWobblyLine(ctx, left, seed);
  drawWobblyLine(ctx, offsetPolyline(terrain.points, -half), seed + 1);

  // Ripple hatch marks inside the water.
  const rand = seededRandom(seed + 2);
  ctx.strokeStyle = 'rgba(90, 140, 170, 0.5)';
  ctx.lineWidth = 1;
  for (const [x, y] of terrain.points) {
    for (let i = 0; i < 2; i++) {
      const ox = (rand() - 0.5) * terrain.width * 0.6;
      const oy = (rand() - 0.5) * terrain.width * 0.4;
      ctx.beginPath();
      ctx.moveTo(x + ox - 8, y + oy);
      ctx.quadraticCurveTo(x + ox, y + oy - 3, x + ox + 8, y + oy);
      ctx.stroke();
    }
  }
}

function drawTerrainFeature(ctx: CanvasRenderingContext2D, terrain: TerrainFeature, index: number): void {
  const seed = 1000 + index * 17;
  if (terrain.type === 'road') drawRoad(ctx, terrain, seed);
  else drawRiver(ctx, terrain, seed);
}

function drawHedge(ctx: CanvasRenderingContext2D, o: ObstacleFeature, seed: number): void {
  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  drawWobblyLine(
    ctx,
    [
      [o.x, o.y],
      [o.x + o.w, o.y],
    ],
    seed
  );
  drawWobblyLine(
    ctx,
    [
      [o.x, o.y + o.h],
      [o.x + o.w, o.y + o.h],
    ],
    seed + 1
  );
  const postCount = Math.max(2, Math.round(o.w / 20));
  for (let i = 0; i <= postCount; i++) {
    const x = o.x + (o.w * i) / postCount;
    ctx.beginPath();
    ctx.moveTo(x, o.y);
    ctx.lineTo(x, o.y + o.h);
    ctx.stroke();
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, o: ObstacleFeature): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(43, 43, 43, 0.4)';
  ctx.lineWidth = 1;
  const spacing = 7;
  for (let d = -o.h; d < o.w; d += spacing) {
    ctx.beginPath();
    ctx.moveTo(o.x + d, o.y);
    ctx.lineTo(o.x + d + o.h, o.y + o.h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(o.x, o.y, o.w, o.h);
}

function drawFoliage(ctx: CanvasRenderingContext2D, o: ObstacleFeature, seed: number, filled: boolean): void {
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const r = Math.min(o.w, o.h) / 2;
  const rand = seededRandom(seed);
  const lobes = 7;

  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const angle = (i / lobes) * Math.PI * 2;
    const lobeR = r * (0.75 + rand() * 0.3);
    const x = cx + Math.cos(angle) * lobeR;
    const y = cy + Math.sin(angle) * lobeR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? 'rgba(120, 130, 110, 0.55)' : 'rgba(150, 160, 140, 0.35)';
  ctx.fill();
  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: ObstacleFeature, index: number): void {
  const seed = 2000 + index * 23;
  switch (o.type) {
    case 'hedge':
      drawHedge(ctx, o, seed);
      break;
    case 'building':
      drawBuilding(ctx, o);
      break;
    case 'tree':
      drawFoliage(ctx, o, seed, true);
      break;
    case 'bush':
      drawFoliage(ctx, o, seed, false);
      break;
  }
}

/** Renders a map's terrain + obstacles once to an offscreen canvas for cheap per-frame blitting. */
export function renderMapToCanvas(map: MapData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable for map render');

  ctx.fillStyle = STYLE.paper;
  ctx.fillRect(0, 0, map.width, map.height);

  map.terrain.forEach((t, i) => drawTerrainFeature(ctx, t, i));
  map.obstacles.forEach((o, i) => drawObstacle(ctx, o, i));

  return canvas;
}
