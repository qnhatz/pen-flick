import type { Scene } from '../core/SceneManager';
import { renderMapToCanvas } from '../render/MapRenderer';
import { drawUnit, drawRangeRing, drawPathPreview, drawBoomEffect, drawHitFlash } from '../render/UnitRenderer';
import { createUnit } from '../entities/registry';
import type { Unit, UnitKind, UnitSide } from '../entities/Unit';
import { TurnManager } from '../systems/TurnManager';
import { AIController } from '../systems/AIController';
import { resolveFlick, type AimSample } from '../systems/ShotSystem';
import { HUD, type TallyEntry } from '../ui/HUD';
import { InputManager, type PointerPoint } from '../core/InputManager';
import { AudioFx } from '../core/AudioFx';
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
const AI_STEP_DELAY_MS = 600;

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
 * enemy side.
 *
 * Session 6 — Opponent AI: an AIController decides one enemy action at a
 * time (fire at the nearest player unit in range, else advance toward it).
 * Each decision is fed into the same confirm-delay -> animate/resolve
 * pipeline the player's drag gesture uses, so AI turns reuse move/shot
 * resolution, hit detection, and BOOM/miss effects verbatim.
 *
 * Session 7 — Win/Lose & Polish: destroying a side's last unit queues a
 * game-over overlay (shown once the BOOM finishes) with a Restart button
 * that re-seeds units/map/turn state in place. Hits get a reddened wobble
 * flash alongside the BOOM burst, and skid/whoosh/boom sounds (synthesized,
 * no audio files) play on path-confirm and shot resolution.
 *
 * Skill pass: firing no longer resolves to wherever the drag point sits.
 * Release velocity (from ShotSystem.resolveFlick) decides it instead — a
 * release under the "skid threshold" speed doesn't fire at all, and a
 * wobbly (non-straight) flick adds angular jitter on top of a small
 * baseline spread. Move mode is untouched (still drag-to-point).
 */
export class MapScene implements Scene {
  private readonly map: MapData = mapData;
  private mapImage: HTMLCanvasElement;
  private readonly units: Unit[] = [];
  private readonly turnManager: TurnManager;
  private readonly aiController: AIController;
  private readonly audioFx = new AudioFx();
  private hud: HUD | null = null;
  private input: InputManager | null = null;

  private heldUnit: Unit | null = null;
  private heldMode: HeldMode | null = null;
  private heldOrigin: PointerPoint | null = null;
  private isDragging = false;
  private dragTarget: PointerPoint | null = null;
  private aimSamples: AimSample[] = [];

  private confirmedTarget: PointerPoint | null = null;
  private confirmDelayRemainingMs = 0;

  private movingUnit: Unit | null = null;
  private moveFrom: PointerPoint | null = null;
  private moveTo: PointerPoint | null = null;
  private moveProgress = 0;

  private boomEffect: { x: number; y: number; kind: UnitKind; side: UnitSide; remainingMs: number } | null = null;
  private postShotRemainingMs = 0;
  private aiStepRemainingMs = 0;

  private gameOver = false;
  private pendingGameOver: 'win' | 'lose' | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly canvas: HTMLCanvasElement
  ) {
    this.mapImage = renderMapToCanvas(this.map);
    this.spawnUnits();

    this.turnManager = new TurnManager(this.units);
    this.turnManager.startTurn('player');
    this.aiController = new AIController(this.units);
  }

  private spawnUnits(): void {
    for (const spawn of this.map.spawns.player) {
      this.units.push(createUnit(spawn.type, spawn.x, spawn.y, 'player'));
    }
    for (const spawn of this.map.spawns.enemy) {
      this.units.push(createUnit(spawn.type, spawn.x, spawn.y, 'enemy'));
    }
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
        if (this.pendingGameOver) {
          const result = this.pendingGameOver;
          this.pendingGameOver = null;
          this.triggerGameOver(result);
        } else {
          this.cancelHold();
        }
      }
    }

    if (this.postShotRemainingMs > 0) {
      this.postShotRemainingMs -= deltaMs;
      if (this.postShotRemainingMs <= 0) this.cancelHold();
    }

    if (this.aiStepRemainingMs > 0) {
      this.aiStepRemainingMs -= deltaMs;
      if (this.aiStepRemainingMs <= 0) this.runNextAIStep();
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
      const ratio = this.boomEffect.remainingMs / BOOM_DURATION_MS;
      drawHitFlash(ctx, this.boomEffect.x, this.boomEffect.y, this.boomEffect.kind, this.boomEffect.side, ratio);
      drawBoomEffect(ctx, this.boomEffect.x, this.boomEffect.y, ratio);
    }
  }

  private handlePointerDown(point: PointerPoint): void {
    this.audioFx.unlock();
    if (this.gameOver) return;
    if (this.movingUnit || this.boomEffect || this.postShotRemainingMs > 0) return;
    if (this.turnManager.activeSide !== 'player') return;
    const unit = this.findSelectableUnitAt(point);
    if (!unit) return;

    this.heldUnit = unit;
    this.heldMode = unit.movesRemaining > 0 ? 'move' : 'fire';
    this.heldOrigin = { x: unit.x, y: unit.y };
    this.isDragging = false;
    this.dragTarget = null;
    this.aimSamples = [{ x: point.x, y: point.y, t: performance.now() }];

    this.hud?.setStatus(this.heldMode === 'move' ? 'Hold unit to move' : 'Hold unit to fire weapon');
    this.updateCountersFor(unit);
  }

  private handlePointerMove(point: PointerPoint): void {
    if (!this.heldUnit || !this.heldMode || !this.heldOrigin || this.movingUnit) return;

    this.aimSamples.push({ x: point.x, y: point.y, t: performance.now() });
    if (this.aimSamples.length > 30) this.aimSamples.shift();

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
    if (this.gameOver || !this.heldUnit || !this.heldMode) return;

    if (this.heldMode === 'fire') {
      this.resolveFireRelease();
      return;
    }

    if (this.isDragging && this.dragTarget) {
      this.confirmedTarget = this.dragTarget;
      this.confirmDelayRemainingMs = CONFIRM_DELAY_MS;
      this.audioFx.playSkid();
      this.hud?.setStatus('Path set, ready to move');
      return;
    }

    this.cancelHold();
  }

  /** Resolves a fire-mode release via ShotSystem.resolveFlick instead of the held drag point. */
  private resolveFireRelease(): void {
    if (!this.heldUnit || !this.heldOrigin) {
      this.cancelHold();
      return;
    }

    const result = resolveFlick(this.heldOrigin, this.aimSamples, this.heldUnit.stats.shotRange);

    if (!result.fired || !result.target) {
      this.isDragging = false;
      this.dragTarget = null;
      this.postShotRemainingMs = MISS_STATUS_DURATION_MS;
      this.hud?.setStatus('Too weak — flick harder!');
      return;
    }

    this.confirmedTarget = result.target;
    this.confirmDelayRemainingMs = CONFIRM_DELAY_MS;
    this.audioFx.playSkid();
    this.hud?.setStatus('Path set, ready to fire');
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
    this.audioFx.playWhoosh();

    if (hitUnit) {
      const idx = this.units.indexOf(hitUnit);
      if (idx >= 0) this.units.splice(idx, 1);
      this.boomEffect = {
        x: hitUnit.x,
        y: hitUnit.y,
        kind: hitUnit.kind,
        side: hitUnit.side,
        remainingMs: BOOM_DURATION_MS,
      };
      this.audioFx.playBoom();
      this.hud?.setStatus('BOOM!!!');
      this.hud?.setTally(this.tallyEntries());

      const enemyLeft = this.units.some((u) => u.side === 'enemy');
      const playerLeft = this.units.some((u) => u.side === 'player');
      if (!enemyLeft) this.pendingGameOver = 'win';
      else if (!playerLeft) this.pendingGameOver = 'lose';
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
    this.audioFx.unlock();
    if (this.gameOver) return;
    const busy =
      this.movingUnit !== null ||
      this.boomEffect !== null ||
      this.postShotRemainingMs > 0 ||
      this.confirmDelayRemainingMs > 0;
    if (this.turnManager.activeSide !== 'player' || busy) return;

    this.cancelHold();
    this.beginEnemyTurn();
  }

  private triggerGameOver(result: 'win' | 'lose'): void {
    this.gameOver = true;
    this.cancelHold();
    this.hud?.setEndTurnEnabled(false);
    this.hud?.showGameOver(result === 'win' ? 'You Win!' : 'You Lose', () => this.restart());
  }

  private restart(): void {
    this.hud?.hideGameOver();
    this.gameOver = false;
    this.pendingGameOver = null;

    this.units.length = 0;
    this.spawnUnits();
    this.mapImage = renderMapToCanvas(this.map);
    this.turnManager.startTurn('player');

    this.heldUnit = null;
    this.heldMode = null;
    this.heldOrigin = null;
    this.isDragging = false;
    this.dragTarget = null;
    this.aimSamples = [];
    this.confirmedTarget = null;
    this.confirmDelayRemainingMs = 0;
    this.movingUnit = null;
    this.moveFrom = null;
    this.moveTo = null;
    this.moveProgress = 0;
    this.boomEffect = null;
    this.postShotRemainingMs = 0;
    this.aiStepRemainingMs = 0;

    this.hud?.setPlayerName('DemonJim');
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.hud?.setTally(this.tallyEntries());
    this.updateEndTurnAvailability();
  }

  private beginEnemyTurn(): void {
    this.turnManager.endTurn();
    this.hud?.setPlayerName('CPU');
    this.hud?.setStatus('Enemy turn…');
    this.hud?.setCounters(0, 0);
    this.aiStepRemainingMs = AI_STEP_DELAY_MS;
  }

  private beginPlayerTurn(): void {
    this.turnManager.endTurn();
    this.aiStepRemainingMs = 0;
    this.hud?.setPlayerName('DemonJim');
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.hud?.setTally(this.tallyEntries());
  }

  /** Asks the AIController for the enemy's next move/shot and feeds it into
   * the same confirm-delay pipeline handlePointerUp uses for the player. */
  private runNextAIStep(): void {
    const action = this.aiController.nextAction('enemy');
    if (!action) {
      this.beginPlayerTurn();
      return;
    }

    this.heldUnit = action.unit;
    this.heldMode = action.mode;
    this.heldOrigin = { x: action.unit.x, y: action.unit.y };
    this.isDragging = true;
    this.dragTarget = action.target;
    this.confirmedTarget = action.target;
    this.confirmDelayRemainingMs = CONFIRM_DELAY_MS;
    this.audioFx.playSkid();
    this.hud?.setStatus(action.mode === 'move' ? 'Path set, ready to move' : 'Path set, ready to fire');
    this.updateCountersFor(action.unit);
  }

  private cancelHold(): void {
    this.heldUnit = null;
    this.heldMode = null;
    this.heldOrigin = null;
    this.isDragging = false;
    this.dragTarget = null;
    this.aimSamples = [];
    this.boomEffect = null;
    this.postShotRemainingMs = 0;
    this.showDefaultStatus();
    this.updateCountersFor(null);
    this.hud?.setTally(this.tallyEntries());

    if (!this.gameOver && this.turnManager.activeSide === 'enemy') {
      this.aiStepRemainingMs = AI_STEP_DELAY_MS;
    }
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
    this.hud?.setEndTurnEnabled(!this.gameOver && this.turnManager.activeSide === 'player' && !busy);
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
