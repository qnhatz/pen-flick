import type { Scene } from '../core/SceneManager';
import { renderMapToCanvas } from '../render/MapRenderer';
import { drawUnit, drawRangeRing, drawPathPreview, drawBoomEffect } from '../render/UnitRenderer';
import { createUnit } from '../entities/registry';
import type { Unit } from '../entities/Unit';
import { TurnManager } from '../systems/TurnManager';
import { HUD, type TallyEntry } from '../ui/HUD';
import { InputManager, type PointerPoint } from '../core/InputManager';
import rawMapData from '../maps/map-01.json';
import type { MapData } from '../maps/types';

const mapData = rawMapData as unknown as MapData;

const HIT_RADIUS = 22;
const SHOT_HIT_RADIUS = 16;
const DRAG_DEADZONE = 8;
const CONFIRM_DELAY_MS = 250;
const MOVE_DURATION_MS = 450;
const BOOM_DURATION_MS = 500;
const MISS_STATUS_DURATION_MS = 500;
const ENEMY_TURN_PLACEHOLDER_MS = 900;

type HeldMode = 'move' | 'fire';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clampToRadius(origin: PointerPoint, point: PointerPoint, radius: number): PointerPoint {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius || dist === 0) return point;
  const scale = radius / dist;
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

/** Distance from point (px,py) to segment (x1,y1)-(x2,y2), plus how far along the segment (0-1). */
function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return { distance: Math.hypot(px - cx, py - cy), t };
}

/**
 * Session 1-4: hand-drawn map + units, hold-drag-release move/shot
 * mechanics with BOOM/miss resolution (see git history for details).
 *
 * Session 5 — Turn System: a TurnManager tracks whose side is active and
 * resets that side's Move/Shot budgets when a turn starts. Only the active
 * side's units are selectable. The End Turn button hands control to the
 * enemy side (budgets reset, a placeholder delay stands in for Session 6's
 * AI) and then back to the player.
 */
export class MapScene implements Scene {
  private readonly map: MapData = mapData;
  private readonly mapImage: HTMLCanvasElement;
  private readonly units: Unit[] = [];
  private readonly turnManager: TurnManager;
  private hud: HUD | null = null;
  private input: InputManager | null = null;

  private heldUnit: Unit | null = null;
  private heldMode: HeldMode | null = null;
  private heldOrigin: PointerPoint | null = null;
  private isDragging = false;
  private dragTarget: PointerPoint | null = null;

  private confirmedTarget: PointerPoint | null = null;
  private confirmDelayRemainingMs = 0;

  private movingUnit: Unit | null = null;
  private moveFrom: PointerPoint | null = null;
  private moveTo: PointerPoint | null = null;
  private moveProgress = 0;

  private boomEffect: { x: number; y: number; remainingMs: number } | null = null;
  private postShotRemainingMs = 0;
  private enemyTurnRemainingMs = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly canvas: HTMLCanvasElement
  ) {
    this.mapImage = renderMapToCanvas(this.map);

    for (const spawn of this.map.spawns.player) {
      this.units.push(createUnit(spawn.type, spawn.x, spawn.y, 'player'));
    }
    for (const spawn of this.map.spawns.enemy) {
      this.units.push(createUnit(spawn.type, spawn.x, spawn.y, 'enemy'));
    }

    this.turnManager = new TurnManager(this.units);
    this.turnManager.startTurn('player');
  }

  enter(): void {
    this.hud = new HUD(this.container, 'DemonJim', () => this.handleEndTurnClicked());
    this.hud.setTally(this.tallyEntries());
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.updateEndTurnAvailability();

    this.input = new InputManager(this.canvas, {
      onPointerDown: (point) => this.handlePointerDown(point),
      onPointerMove: (point) => this.handlePointerMove(point),
      onPointerUp: () => this.handlePointerUp(),
    });
  }

  exit(): void {
    this.input?.dispose();
    this.input = null;
    this.hud?.destroy();
    this.hud = null;
  }

  update(deltaMs: number): void {
    if (this.confirmedTarget && this.confirmDelayRemainingMs > 0) {
      this.confirmDelayRemainingMs -= deltaMs;
      if (this.confirmDelayRemainingMs <= 0) {
        if (this.heldMode === 'move') this.beginMoveAnimation();
        else this.resolveShot();
      }
    }

    if (this.movingUnit && this.moveFrom && this.moveTo) {
      this.moveProgress = Math.min(1, this.moveProgress + deltaMs / MOVE_DURATION_MS);
      this.movingUnit.x = lerp(this.moveFrom.x, this.moveTo.x, this.moveProgress);
      this.movingUnit.y = lerp(this.moveFrom.y, this.moveTo.y, this.moveProgress);
      if (this.moveProgress >= 1) this.finishMoveAnimation();
    }

    if (this.boomEffect) {
      this.boomEffect.remainingMs -= deltaMs;
      if (this.boomEffect.remainingMs <= 0) {
        this.boomEffect = null;
        this.cancelHold();
      }
    }

    if (this.postShotRemainingMs > 0) {
      this.postShotRemainingMs -= deltaMs;
      if (this.postShotRemainingMs <= 0) this.cancelHold();
    }

    if (this.enemyTurnRemainingMs > 0) {
      this.enemyTurnRemainingMs -= deltaMs;
      if (this.enemyTurnRemainingMs <= 0) this.beginPlayerTurn();
    }

    this.updateEndTurnAvailability();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.mapImage, 0, 0);

    if (this.heldUnit && this.heldMode) {
      const radius =
        this.heldMode === 'move' ? this.heldUnit.stats.moveRange : this.heldUnit.stats.shotRange;
      drawRangeRing(ctx, this.heldUnit, radius, this.heldMode);

      if (this.isDragging && this.dragTarget) {
        drawPathPreview(ctx, this.heldUnit, this.dragTarget, this.heldMode);
      }
    }

    for (const unit of this.units) drawUnit(ctx, unit);

    if (this.boomEffect) {
      drawBoomEffect(ctx, this.boomEffect.x, this.boomEffect.y, this.boomEffect.remainingMs / BOOM_DURATION_MS);
    }
  }

  private handlePointerDown(point: PointerPoint): void {
    if (this.movingUnit || this.boomEffect || this.postShotRemainingMs > 0) return;
    if (this.turnManager.activeSide !== 'player') return;
    const unit = this.findSelectableUnitAt(point);
    if (!unit) return;

    this.heldUnit = unit;
    this.heldMode = unit.movesRemaining > 0 ? 'move' : 'fire';
    this.heldOrigin = { x: unit.x, y: unit.y };
    this.isDragging = false;
    this.dragTarget = null;

    this.hud?.setStatus(this.heldMode === 'move' ? 'Hold unit to move' : 'Hold unit to fire weapon');
    this.updateCountersFor(unit);
  }

  private handlePointerMove(point: PointerPoint): void {
    if (!this.heldUnit || !this.heldMode || !this.heldOrigin || this.movingUnit) return;

    const dist = Math.hypot(point.x - this.heldOrigin.x, point.y - this.heldOrigin.y);
    if (dist < DRAG_DEADZONE) {
      this.isDragging = false;
      this.dragTarget = null;
      return;
    }

    const range = this.heldMode === 'move' ? this.heldUnit.stats.moveRange : this.heldUnit.stats.shotRange;
    this.isDragging = true;
    this.dragTarget = clampToRadius(this.heldOrigin, point, range);
    this.hud?.setStatus('Drag pencil away to set path');
  }

  private handlePointerUp(): void {
    if (!this.heldUnit || !this.heldMode) return;

    if (this.isDragging && this.dragTarget) {
      this.confirmedTarget = this.dragTarget;
      this.confirmDelayRemainingMs = CONFIRM_DELAY_MS;
      this.hud?.setStatus(this.heldMode === 'move' ? 'Path set, ready to move' : 'Path set, ready to fire');
      return;
    }

    this.cancelHold();
  }

  private beginMoveAnimation(): void {
    if (!this.heldUnit || !this.confirmedTarget) {
      this.cancelHold();
      return;
    }
    this.movingUnit = this.heldUnit;
    this.moveFrom = { x: this.heldUnit.x, y: this.heldUnit.y };
    this.moveTo = this.confirmedTarget;
    this.moveProgress = 0;
    this.hud?.setStatus('Move in progress…');
  }

  private finishMoveAnimation(): void {
    if (this.movingUnit) {
      this.movingUnit.movesRemaining = Math.max(0, this.movingUnit.movesRemaining - 1);
    }
    this.movingUnit = null;
    this.moveFrom = null;
    this.moveTo = null;
    this.moveProgress = 0;
    this.confirmedTarget = null;
    this.confirmDelayRemainingMs = 0;
    this.cancelHold();
  }

  private resolveShot(): void {
    if (!this.heldUnit || !this.confirmedTarget) {
      this.cancelHold();
      return;
    }
    const shooter = this.heldUnit;
    const target = this.confirmedTarget;
    const hitUnit = this.findHitUnit(shooter, target);

    shooter.shotsRemaining = Math.max(0, shooter.shotsRemaining - 1);
    this.isDragging = false;
    this.dragTarget = null;
    this.confirmedTarget = null;
    this.confirmDelayRemainingMs = 0;

    if (hitUnit) {
      const idx = this.units.indexOf(hitUnit);
      if (idx >= 0) this.units.splice(idx, 1);
      this.boomEffect = { x: hitUnit.x, y: hitUnit.y, remainingMs: BOOM_DURATION_MS };
      this.hud?.setStatus('BOOM!!!');
      this.hud?.setTally(this.tallyEntries());
    } else {
      this.drawMissMark(shooter, target);
      this.postShotRemainingMs = MISS_STATUS_DURATION_MS;
      this.hud?.setStatus('Miss!');
    }
  }

  private findHitUnit(shooter: Unit, target: PointerPoint): Unit | null {
    let best: { unit: Unit; t: number } | null = null;
    for (const unit of this.units) {
      if (unit.side === shooter.side) continue;
      const { distance, t } = distanceToSegment(unit.x, unit.y, shooter.x, shooter.y, target.x, target.y);
      if (distance <= SHOT_HIT_RADIUS && (!best || t < best.t)) best = { unit, t };
    }
    return best?.unit ?? null;
  }

  private drawMissMark(shooter: Unit, target: PointerPoint): void {
    const ctx = this.mapImage.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(43, 43, 43, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.restore();
  }

  private handleEndTurnClicked(): void {
    const busy =
      this.movingUnit !== null ||
      this.boomEffect !== null ||
      this.postShotRemainingMs > 0 ||
      this.confirmDelayRemainingMs > 0;
    if (this.turnManager.activeSide !== 'player' || busy) return;

    this.cancelHold();
    this.beginEnemyTurn();
  }

  private beginEnemyTurn(): void {
    this.turnManager.endTurn();
    this.hud?.setPlayerName('CPU');
    this.hud?.setStatus('Enemy turn…');
    this.hud?.setCounters(0, 0);
    this.enemyTurnRemainingMs = ENEMY_TURN_PLACEHOLDER_MS;
  }

  private beginPlayerTurn(): void {
    this.turnManager.endTurn();
    this.enemyTurnRemainingMs = 0;
    this.hud?.setPlayerName('DemonJim');
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.hud?.setTally(this.tallyEntries());
  }

  private cancelHold(): void {
    this.heldUnit = null;
    this.heldMode = null;
    this.heldOrigin = null;
    this.isDragging = false;
    this.dragTarget = null;
    this.boomEffect = null;
    this.postShotRemainingMs = 0;
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.hud?.setTally(this.tallyEntries());
  }

  private findSelectableUnitAt(point: PointerPoint): Unit | null {
    for (const unit of this.units) {
      if (unit.side !== this.turnManager.activeSide) continue;
      if (unit.movesRemaining <= 0 && unit.shotsRemaining <= 0) continue;
      if (Math.hypot(unit.x - point.x, unit.y - point.y) <= HIT_RADIUS) return unit;
    }
    return null;
  }

  private showDefaultStatus(): void {
    this.hud?.setStatus(this.map.name);
  }

  private updateCountersFor(unit: Unit | null): void {
    const reference = unit ?? this.units.find((u) => u.side === this.turnManager.activeSide);
    this.hud?.setCounters(reference?.movesRemaining ?? 0, reference?.shotsRemaining ?? 0);
  }

  private updateEndTurnAvailability(): void {
    const busy =
      this.movingUnit !== null ||
      this.boomEffect !== null ||
      this.postShotRemainingMs > 0 ||
      this.confirmDelayRemainingMs > 0;
    this.hud?.setEndTurnEnabled(this.turnManager.activeSide === 'player' && !busy);
  }

  private tallyEntries(): TallyEntry[] {
    const counts = new Map<string, number>();
    for (const unit of this.units) {
      const key = `${unit.side === 'player' ? 'YOU' : 'CPU'} ${unit.kind}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }
}
