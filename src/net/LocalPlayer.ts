import type { Player } from './Player';

/** Human player on this device, driven by pointer input. Turn ends via End Turn UI. */
export class LocalPlayer implements Player {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}

  takeTurn(): Promise<void> {
    return new Promise((resolve) => {
      // Session 5 wires this to the End Turn button.
      this._resolveTurn = resolve;
    });
  }

  endTurn(): void {
    this._resolveTurn?.();
    this._resolveTurn = undefined;
  }

  private _resolveTurn?: () => void;
}
