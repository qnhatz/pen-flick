import type { Scene } from '../core/SceneManager';
import { renderMapToCanvas } from '../render/MapRenderer';
import { drawUnit, drawRangeRing } from '../render/UnitRenderer';
import { createUnit } from '../entities/registry';
import type { Unit } from '../entities/Unit';
import { HUD, type TallyEntry } from '../ui/HUD';
import { InputManager, type PointerPoint } from '../core/InputManager';
import rawMapData from '../maps/map-01.json';
import type { MapData } from '../maps/types';

const mapData = rawMapData as unknown as MapData;

const HIT_RADIUS = 22;

type HeldMode = 'move' | 'fire';

/**
 * Session 1 — Static Scene: renders a map (terrain + obstacles, cached to an
 * offscreen canvas) with units placed at their spawn points, plus the HUD
 * shell.
 *
 * Session 2 — Unit Selection & Radius Ring: touch-and-hold a player unit to
 * select it; a dashed range ring (move or fire range, whichever is active)
 * is drawn while held, and the HUD status/counters reflect the held unit.
 * Dragging to set a path/aim lands in Sessions 3-4.
 */
export class MapScene implements Scene {
  private readonly map: MapData = mapData;
  private readonly mapImage: HTMLCanvasElement;
  private readonly units: Unit[] = [];
  private hud: HUD | null = null;
  private input: InputManager | null = null;

  private heldUnit: Unit | null = null;
  private heldMode: HeldMode | null = null;

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
      onPointerUp: () => this.handlePointerUp(),
    });
  }

  exit(): void {
    this.input?.dispose();
    this.input = null;
    this.hud?.destroy();
    this.hud = null;
  }

  update(_deltaMs: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.mapImage, 0, 0);

    if (this.heldUnit && this.heldMode) {
      const radius =
        this.heldMode === 'move' ? this.heldUnit.stats.moveRange : this.heldUnit.stats.shotRange;
      drawRangeRing(ctx, this.heldUnit, radius, this.heldMode);
    }

    for (const unit of this.units) drawUnit(ctx, unit);
  }

  private handlePointerDown(point: PointerPoint): void {
    const unit = this.findSelectableUnitAt(point);
    if (!unit) return;

    this.heldUnit = unit;
    this.heldMode = unit.shotsRemaining > 0 ? 'fire' : 'move';
    this.hud?.setStatus(this.heldMode === 'fire' ? 'Hold unit to fire weapon' : 'Hold unit to move');
    this.updateCountersFor(unit);
  }

  private handlePointerUp(): void {
    if (!this.heldUnit) return;
    this.heldUnit = null;
    this.heldMode = null;
    this.showDefaultStatus();
    this.updateCountersFor(null);
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
