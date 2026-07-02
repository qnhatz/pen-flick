import type { UnitSide } from './Unit';
import { Tank } from './Tank';
import { Plane } from './Plane';

/** Maps a map JSON's unit "type" string to a constructor — add new units here only. */
export const unitRegistry = {
  tank: Tank,
  plane: Plane,
} as const;

export type UnitTypeName = keyof typeof unitRegistry;

export function createUnit(type: UnitTypeName, x: number, y: number, side: UnitSide) {
  return new unitRegistry[type](x, y, side);
}
