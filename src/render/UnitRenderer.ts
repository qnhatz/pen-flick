import { STYLE } from './style';
import type { Unit } from '../entities/Unit';

const SIDE_COLOR: Record<Unit['side'], string> = {
  player: '#1d4ed8',
  enemy: '#b91c1c',
};

function drawTank(ctx: CanvasRenderingContext2D, facing: 1 | -1): void {
  ctx.beginPath();
  ctx.rect(-13, -9, 26, 18);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -16 * facing);
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPlane(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(4, -4);
  ctx.lineTo(16, 4);
  ctx.lineTo(4, 4);
  ctx.lineTo(6, 14);
  ctx.lineTo(0, 9);
  ctx.lineTo(-6, 14);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-16, 4);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Draws a single unit's top-down sketch icon at its current position. */
export function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit): void {
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.fillStyle = SIDE_COLOR[unit.side];
  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  if (unit.kind === 'tank') {
    drawTank(ctx, unit.side === 'player' ? -1 : 1);
  } else {
    drawPlane(ctx);
  }

  ctx.restore();
}

const RING_COLOR: Record<'move' | 'fire', string> = {
  move: '#1d4ed8',
  fire: '#b91c1c',
};

/** Dashed range ring shown while a unit is held, sized to its move or shot range. */
export function drawRangeRing(ctx: CanvasRenderingContext2D, unit: Unit, radius: number, mode: 'move' | 'fire'): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, radius, 0, Math.PI * 2);
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = RING_COLOR[mode];
  ctx.stroke();
  ctx.restore();
}

/** Line + arrowhead from a unit to the (already range-clamped) drag point. */
export function drawPathPreview(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  target: { x: number; y: number },
  mode: 'move' | 'fire'
): void {
  const color = RING_COLOR[mode];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(unit.x, unit.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();

  const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
  const headLen = 10;
  ctx.beginPath();
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(
    target.x - headLen * Math.cos(angle - Math.PI / 6),
    target.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    target.x - headLen * Math.cos(angle + Math.PI / 6),
    target.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Spiky "BOOM!!!" burst at an impact point, sized/faded by remaining lifeRatio (1 -> 0). */
export function drawBoomEffect(ctx: CanvasRenderingContext2D, x: number, y: number, lifeRatio: number): void {
  const scale = 1 + (1 - lifeRatio) * 0.6;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, lifeRatio));
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const spikes = 8;
  const outerR = 22;
  const innerR = 10;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / spikes;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = STYLE.ink;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
