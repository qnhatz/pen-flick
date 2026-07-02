import type { Scene } from '../core/SceneManager';
import { renderMapToCanvas } from '../render/MapRenderer';
import { drawUnit, drawRangeRing, drawPathPreview } from '../render/UnitRenderer';
import { createUnit } from '../entities/registry';
import type { Unit } from '../entities/Unit';
import { HUD, type TallyEntry } from '../ui/HUD';
import { InputManager, type PointerPoint } from '../core/InputManager';
import rawMapData from '../maps/map-01.json';
import type { MapData } from '../maps/types';

const mapData = rawMapData as unknown as MapData;

const HIT_RADIUS = 22;
const DRAG_DEADZONE = 8;
const CONFIRM_DELAY_MS = 250;
const MOVE_DURATION_MS = 450;

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

/**
 * Session 1 (Static Scene) + Session 2 (Selection & Radius Ring) + Session 3
 * (Move Mechanic): hold a player unit to select it (move mode takes
 * priority while moves remain, else fire mode — Session 4 wires fire
 * dragging), drag to set a path clamped to its move range, release to
 * animate the unit along that path and spend a Move.
 */
export class MapScene implements Scene {
  private readonly map: MapData = mapData;
  private readonly mapImage: HTMLCanvasElement;
  private readonly units: Unit[] = [];
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
  }

  enter(): void {
    this.hud = new HUD(this.container, 'DemonJim');
    this.hud.setTally(this.tallyEntries());
    this.showDefaultStatus();
    this.updateCountersFor(null);

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
      if (this.confirmDelayRemainingMs <= 0) this.beginMoveAnimation();
    }

    if (this.movingUnit && this.moveFrom && this.moveTo) {
      this.moveProgress = Math.min(1, this.moveProgress + deltaMs / MOVE_DURATION_MS);
      this.movingUnit.x = lerp(this.moveFrom.x, this.moveTo.x, this.moveProgress);
      this.movingUnit.y = lerp(this.moveFrom.y, this.moveTo.y, this.moveProgress);
      if (this.moveProgress >= 1) this.finishMoveAnimation();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.mapImage, 0, 0);

    if (this.heldUnit && this.heldMode) {
      const radius =
        this.heldMode === 'move' ? this.heldUnit.stats.moveRange : this.heldUnit.stats.shotRange;
      drawRangeRing(ctx, this.heldUnit, radius, this.heldMode);

      if (this.heldMode === 'move' && this.isDragging && this.dragTarget) {
        drawPathPreview(ctx, this.heldUnit, this.dragTarget, 'move');
      }
    }

    for (const unit of this.units) drawUnit(ctx, unit);
  }

  private handlePointerDown(point: PointerPoint): void {
    if (this.movingUnit) return;
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
    if (!this.heldUnit || this.heldMode !== 'move' || !this.heldOrigin || this.movingUnit) return;

    const dist = Math.hypot(point.x - this.heldOrigin.x, point.y - this.heldOrigin.y);
    if (dist < DRAG_DEADZONE) {
      this.isDragging = false;
      this.dragTarget = null;
      return;
    }

    this.isDragging = true;
    this.dragTarget = clampToRadius(this.heldOrigin, point, this.heldUnit.stats.moveRange);
    this.hud?.setStatus('Drag pencil away to set path');
  }

  private handlePointerUp(): void {
    if (!this.heldUnit || !this.heldMode) return;

    if (this.heldMode === 'move' && this.isDragging && this.dragTarget) {
      this.confirmedTarget = this.dragTarget;
      this.confirmDelayRemainingMs = CONFIRM_DELAY_MS;
      this.hud?.setStatus('Path set, ready to move');
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

  private cancelHold(): void {
    this.heldUnit = null;
    this.heldMode = null;
    this.heldOrigin = null;
    this.isDragging = false;
    this.dragTarget = null;
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.hud?.setTally(this.tallyEntries());
  }

  private findSelectableUnitAt(point: PointerPoint): Unit | null {
    for (const unit of this.units) {
      if (unit.side !== 'player') continue;
      if (unit.movesRemaining <= 0 && unit.shotsRemaining <= 0) continue;
      if (Math.hypot(unit.x - point.x, unit.y - point.y) <= HIT_RADIUS) return unit;
    }
    return null;
  }

  private showDefaultStatus(): void {
    this.hud?.setStatus(this.map.name);
  }

  private updateCountersFor(unit: Unit | null): void {
    const reference = unit ?? this.units.find((u) => u.side === 'player');
    this.hud?.setCounters(reference?.movesRemaining ?? 0, reference?.shotsRemaining ?? 0);
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
