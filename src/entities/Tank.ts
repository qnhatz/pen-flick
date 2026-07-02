import { Unit, type UnitSide } from './Unit';

export class Tank extends Unit {
  constructor(x: number, y: number, side: UnitSide) {
    super(x, y, side, { moveRange: 80, shotRange: 150, movesPerTurn: 1, shotsPerTurn: 1 });
  }
}
