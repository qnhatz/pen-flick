export type UnitSide = 'player' | 'enemy';

export interface UnitStats {
  moveRange: number;
  shotRange: number;
  movesPerTurn: number;
  shotsPerTurn: number;
}

/** Base class for all battlefield objects (tanks, planes, ...). Session 1+ fills in behavior. */
export abstract class Unit {
  x: number;
  y: number;
  readonly side: UnitSide;
  readonly stats: UnitStats;
  movesRemaining: number;
  shotsRemaining: number;
  alive = true;

  constructor(x: number, y: number, side: UnitSide, stats: UnitStats) {
    this.x = x;
    this.y = y;
    this.side = side;
    this.stats = stats;
    this.movesRemaining = stats.movesPerTurn;
    this.shotsRemaining = stats.shotsPerTurn;
  }

  resetTurnBudget(): void {
    this.movesRemaining = this.stats.movesPerTurn;
    this.shotsRemaining = this.stats.shotsPerTurn;
  }
}
