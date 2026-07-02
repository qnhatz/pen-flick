import type { Player } from './Player';

/** Remote peer over a network transport. Stubbed until Session 9 (Multiplayer). */
export class NetworkPlayer implements Player {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}

  async takeTurn(): Promise<void> {
    throw new Error('NetworkPlayer.takeTurn not implemented until Session 9');
  }
}
