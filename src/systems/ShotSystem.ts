export interface AimSample {
  x: number;
  y: number;
  t: number;
}

export interface FlickResult {
  fired: boolean;
  speed: number;
  target?: { x: number; y: number };
}

/** How far back (ms) we look when measuring release velocity. */
const VELOCITY_WINDOW_MS = 120;
/** Minimum release speed (px/ms) to fire at all — the "skid threshold". */
const SKID_THRESHOLD_PX_PER_MS = 0.6;
/** Speed at which reach and precision are maxed out. */
const MAX_SPEED_PX_PER_MS = 2.2;
/** Reach as a fraction of shotRange right at the threshold (ramps to 1 at MAX_SPEED). */
const MIN_REACH_RATIO = 0.35;
/** Minimum angular spread even on a clean flick (degrees). */
const BASE_JITTER_DEG = 4;
/** Extra spread added for a wobbly (non-straight) release (degrees). */
const WOBBLE_JITTER_DEG = 22;

function angleOf(dx: number, dy: number): number {
  return Math.atan2(dy, dx);
}

/** Smallest signed difference between two angles (radians), in (-PI, PI]. */
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Resolves a fire-mode release gesture the way a flicked pencil resolves a
 * shot: below a minimum release speed nothing fires (the "skid threshold"
 * from the real game — see LEAD_WARS_REFERENCE.md). Above it, the shot's
 * direction and reach come from the release *velocity*, not the held
 * point, and a wobbly (non-straight) flick adds extra angular jitter on
 * top of a small baseline spread — a clean, deliberate flick is the most
 * accurate.
 */
export function resolveFlick(
  origin: { x: number; y: number },
  samples: readonly AimSample[],
  shotRange: number
): FlickResult {
  if (samples.length < 2) return { fired: false, speed: 0 };

  const now = samples[samples.length - 1].t;
  const windowed = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
  if (windowed.length < 2) return { fired: false, speed: 0 };

  const first = windowed[0];
  const last = windowed[windowed.length - 1];
  const dt = last.t - first.t;
  if (dt <= 0) return { fired: false, speed: 0 };

  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const speed = Math.hypot(dx, dy) / dt;

  if (speed < SKID_THRESHOLD_PX_PER_MS) {
    return { fired: false, speed };
  }

  let wobble = 0;
  if (windowed.length >= 3) {
    const mid = windowed[Math.floor(windowed.length / 2)];
    const angleEarly = angleOf(mid.x - first.x, mid.y - first.y);
    const angleLate = angleOf(last.x - mid.x, last.y - mid.y);
    wobble = Math.min(1, Math.abs(angleDiff(angleLate, angleEarly)) / (Math.PI / 2));
  }

  const jitterDeg = BASE_JITTER_DEG + wobble * WOBBLE_JITTER_DEG;
  const jitterRad = ((Math.random() * 2 - 1) * jitterDeg * Math.PI) / 180;
  const finalAngle = angleOf(dx, dy) + jitterRad;

  const speedRatio = Math.min(
    1,
    Math.max(0, (speed - SKID_THRESHOLD_PX_PER_MS) / (MAX_SPEED_PX_PER_MS - SKID_THRESHOLD_PX_PER_MS))
  );
  const reach = shotRange * (MIN_REACH_RATIO + (1 - MIN_REACH_RATIO) * speedRatio);

  return {
    fired: true,
    speed,
    target: {
      x: origin.x + Math.cos(finalAngle) * reach,
      y: origin.y + Math.sin(finalAngle) * reach,
    },
  };
}
