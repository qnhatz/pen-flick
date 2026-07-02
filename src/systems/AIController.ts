import type { Unit, UnitSide } from '../entities/Unit';

export interface AIAction {
  unit: Unit;
  mode: 'move' | 'fire';
  target: { x: number; y: number };
}

/** How close an AI unit will advance toward its target before holding position. */
const STANDOFF_DISTANCE = 30;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Picks one action at a time for a side: fire at the nearest enemy if one is
 * in range and a shot remains, otherwise advance toward the nearest enemy
 * if a move remains. Reuses the caller's move/shot resolution — this class
 * only decides *what* to do, not how a move or shot resolves.
 */
export class AIController {
  constructor(private readonly units: readonly Unit[]) {}

  /** Returns the next action for `side`, or null once nothing productive is left to do. */
  nextAction(side: UnitSide): AIAction | null {
    const targets = this.units.filter((u) => u.side !== side);
    if (targets.length === 0) return null;

    for (const unit of this.units) {
      if (unit.side !== side) continue;
      if (unit.movesRemaining <= 0 && unit.shotsRemaining <= 0) continue;

      const nearest = this.nearest(unit, targets);
      const dist = distance(unit, nearest);

      if (unit.shotsRemaining > 0 && dist <= unit.stats.shotRange) {
        return { unit, mode: 'fire', target: { x: nearest.x, y: nearest.y } };
      }

      if (unit.movesRemaining > 0 && dist > STANDOFF_DISTANCE) {
        const dx = nearest.x - unit.x;
        const dy = nearest.y - unit.y;
        const len = Math.hypot(dx, dy) || 1;
        const moveDist = Math.min(unit.stats.moveRange, len - STANDOFF_DISTANCE);
        if (moveDist > 1) {
          return {
            unit,
            mode: 'move',
            target: { x: unit.x + (dx / len) * moveDist, y: unit.y + (dy / len) * moveDist },
          };
        }
      }

      // Nothing productive for this unit right now — exhaust its budget so
      // we don't ask it the same question again this turn, then keep
      // scanning the rest of the side.
      unit.movesRemaining = 0;
      unit.shotsRemaining = 0;
    }

    return null;
  }

  private nearest(from: Unit, candidates: Unit[]): Unit {
    let best = candidates[0];
    let bestDist = distance(from, best);
    for (const candidate of candidates) {
      const dist = distance(from, candidate);
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    return best;
  }
}
