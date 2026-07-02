export interface TallyEntry {
  label: string;
  count: number;
}

/** DOM overlay for HUD chrome (status, counters, buttons) drawn above the game canvas. */
export class HUD {
  readonly root: HTMLDivElement;
  private readonly statusEl: HTMLDivElement;
  private readonly movesEl: HTMLDivElement;
  private readonly shotsEl: HTMLDivElement;
  private readonly tallyEl: HTMLDivElement;
  private readonly playerNameEl: HTMLDivElement;
  private readonly endTurnEl: HTMLButtonElement;

  constructor(container: HTMLElement, playerName: string, onEndTurn: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud';

    this.endTurnEl = document.createElement('button');
    this.endTurnEl.type = 'button';
    this.endTurnEl.className = 'hud-chip hud-end-turn';
    this.endTurnEl.textContent = 'End Turn';
    this.endTurnEl.addEventListener('click', onEndTurn);

    this.playerNameEl = this.makeChip(playerName, 'hud-player-name');

    const topLeft = document.createElement('div');
    topLeft.className = 'hud-top-left';
    topLeft.append(this.makeChip('II', 'hud-pause'), this.endTurnEl, this.playerNameEl);

    this.statusEl = this.makeChip('', 'hud-status');

    const topRight = document.createElement('div');
    topRight.className = 'hud-top-right';
    this.movesEl = this.makeChip('', 'hud-counter');
    this.shotsEl = this.makeChip('', 'hud-counter');
    topRight.append(this.movesEl, this.shotsEl);

    this.tallyEl = document.createElement('div');
    this.tallyEl.className = 'hud-tally';

    this.root.append(topLeft, this.statusEl, topRight, this.tallyEl);
    container.appendChild(this.root);
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  setCounters(moves: number, shots: number): void {
    this.movesEl.textContent = `${moves} Moves`;
    this.shotsEl.textContent = `${shots} Shots`;
  }

  setPlayerName(name: string): void {
    this.playerNameEl.textContent = name;
  }

  setEndTurnEnabled(enabled: boolean): void {
    this.endTurnEl.disabled = !enabled;
  }

  setTally(entries: TallyEntry[]): void {
    this.tallyEl.replaceChildren(
      ...entries.map((entry) => {
        const chip = document.createElement('span');
        chip.className = 'hud-chip hud-tally-chip';
        chip.textContent = `${entry.label} x${entry.count}`;
        return chip;
      })
    );
  }

  destroy(): void {
    this.root.remove();
  }

  private makeChip(text: string, extraClass: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `hud-chip ${extraClass}`;
    el.textContent = text;
    return el;
  }
}
