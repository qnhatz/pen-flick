import { Unit, type UnitSide } from './Unit';

export class Plane extends Unit {
  constructor(x: number, y: number, side: UnitSide) {
    super(x, y, side, 'plane', { moveRange: 160, shotRange: 100, movesPerTurn: 2, shotsPerTurn: 1 });
  }
}
