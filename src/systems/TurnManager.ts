import type { Unit, UnitSide } from '../entities/Unit';

/**
 * Tracks whose turn it is and resets that side's unit budgets when a turn
 * starts. Holds a live reference to the shared units array (not a copy) so
 * units removed by ShotSystem hits stay in sync automatically.
 */
export class TurnManager {
  activeSide: UnitSide = 'player';

  constructor(private readonly units: readonly Unit[]) {}

  startTurn(side: UnitSide): void {
    this.activeSide = side;
    for (const unit of this.units) {
      if (unit.side === side) unit.resetTurnBudget();
    }
  }

  /** Switches to the other side and resets its budgets. Returns the new active side. */
  endTurn(): UnitSide {
    const next: UnitSide = this.activeSide === 'player' ? 'enemy' : 'player';
    this.startTurn(next);
    return next;
  }
}
