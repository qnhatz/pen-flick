export interface PointerPoint {
  x: number;
  y: number;
}

export interface InputHandlers {
  onPointerDown?(point: PointerPoint): void;
  onPointerMove?(point: PointerPoint): void;
  onPointerUp?(point: PointerPoint): void;
}

/**
 * Normalizes mouse + touch into a single Pointer Events stream, since touch
 * is the primary target (tablet/phone) and mouse is only used for dev.
 */
export class InputManager {
  constructor(
    private readonly target: HTMLElement,
    private readonly handlers: InputHandlers
  ) {
    target.style.touchAction = 'none';
    target.addEventListener('pointerdown', this.handleDown);
    target.addEventListener('pointermove', this.handleMove);
    target.addEventListener('pointerup', this.handleUp);
    target.addEventListener('pointercancel', this.handleUp);
  }

  dispose(): void {
    this.target.removeEventListener('pointerdown', this.handleDown);
    this.target.removeEventListener('pointermove', this.handleMove);
    this.target.removeEventListener('pointerup', this.handleUp);
    this.target.removeEventListener('pointercancel', this.handleUp);
  }

  private toPoint(e: PointerEvent): PointerPoint {
    const rect = this.target.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private handleDown = (e: PointerEvent): void => {
    this.handlers.onPointerDown?.(this.toPoint(e));
  };

  private handleMove = (e: PointerEvent): void => {
    this.handlers.onPointerMove?.(this.toPoint(e));
  };

  private handleUp = (e: PointerEvent): void => {
    this.handlers.onPointerUp?.(this.toPoint(e));
  };
}
