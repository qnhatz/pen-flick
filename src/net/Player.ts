/**
 * A turn participant — local human, CPU, or remote peer. Game systems talk
 * only to this interface so swapping the opponent (AI now, network later)
 * never touches move/shot/turn logic.
 */
export interface Player {
  readonly id: string;
  readonly name: string;
  /** Called when it becomes this player's turn; resolve once their turn is over. */
  takeTurn(): Promise<void>;
}
