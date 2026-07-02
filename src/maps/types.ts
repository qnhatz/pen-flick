export type TerrainType = 'road' | 'river';

export interface TerrainFeature {
  type: TerrainType;
  points: [number, number][];
  width: number;
}

export type ObstacleType = 'hedge' | 'building' | 'tree' | 'bush';

export interface ObstacleFeature {
  type: ObstacleType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type UnitTypeName = 'tank' | 'plane';

export interface SpawnEntry {
  type: UnitTypeName;
  x: number;
  y: number;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  terrain: TerrainFeature[];
  obstacles: ObstacleFeature[];
  spawns: {
    player: SpawnEntry[];
    enemy: SpawnEntry[];
  };
}
