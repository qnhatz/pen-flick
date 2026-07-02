/** Minimum reach as a fraction of shotRange — avoids a literal 0% shot going nowhere. */
const MIN_POWER = 0.08;

/** Ping-pongs 0 -> 1 -> 0 over `periodMs`, at whatever point `elapsedMs` lands in the cycle. */
export function triangleWave(elapsedMs: number, periodMs: number): number {
  const t = (elapsedMs % periodMs) / periodMs;
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

/**
 * Worms-style power shot: direction comes from the player's aim drag
 * (fixed the moment they release), reach comes from where they tap to
 * lock a power value oscillating between 0 and 1. Both angle *and* power
 * have to be right — undershooting lands short, overshooting flies past.
 */
export function resolvePoweredShot(
  origin: { x: number; y: number },
  angle: number,
  power: number,
  shotRange: number
): { x: number; y: number } {
  const reach = shotRange * Math.max(MIN_POWER, Math.min(1, power));
  return {
    x: origin.x + Math.cos(angle) * reach,
    y: origin.y + Math.sin(angle) * reach,
  };
}
