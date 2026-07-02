import type { Scene } from '../core/SceneManager';
import { renderMapToCanvas } from '../render/MapRenderer';
import { drawUnit } from '../render/UnitRenderer';
import { createUnit } from '../entities/registry';
import type { Unit } from '../entities/Unit';
import { HUD, type TallyEntry } from '../ui/HUD';
import rawMapData from '../maps/map-01.json';
import type { MapData } from '../maps/types';

const mapData = rawMapData as unknown as MapData;

/**
 * Session 1 — Static Scene: renders a map (terrain + obstacles, cached to an
 * offscreen canvas) with units placed at their spawn points, plus the HUD
 * shell. Selection/movement/firing land in Sessions 2-4.
 */
export class MapScene implements Scene {
  private readonly map: MapData = mapData;
  private readonly mapImage: HTMLCanvasElement;
  private readonly units: Unit[] = [];
  private hud: HUD | null = null;

  constructor(private readonly container: HTMLElement) {
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
    this.hud.setStatus(`${this.map.name}`);
    this.hud.setTally(this.tallyEntries());

    const firstPlayerUnit = this.units.find((u) => u.side === 'player');
    this.hud.setCounters(firstPlayerUnit?.movesRemaining ?? 0, firstPlayerUnit?.shotsRemaining ?? 0);
  }

  exit(): void {
    this.hud?.destroy();
    this.hud = null;
  }

  update(_deltaMs: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.mapImage, 0, 0);
    for (const unit of this.units) drawUnit(ctx, unit);
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
