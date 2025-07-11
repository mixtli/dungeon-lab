import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';

export interface Point {
  x: number;
  y: number;
}

/**
 * Check if a position is within the map boundaries
 * @param position Position to check (in world coordinates)
 * @param mapData Map data containing resolution information
 * @returns true if position is valid (within bounds), false if outside bounds
 */
export function isPositionWithinBounds(
  position: Point,
  mapData: IMapResponse | null
): boolean {
  if (!mapData?.uvtt?.resolution?.map_size) {
    console.log('[BoundsValidation] No map size data available, allowing movement');
    return true; // No bounds data, allow movement
  }

  const { map_size } = mapData.uvtt.resolution;
  const mapWidth = map_size.x;
  const mapHeight = map_size.y;

  console.log(`[BoundsValidation] Checking position ${JSON.stringify(position)} against map bounds ${mapWidth}x${mapHeight}`);

  // Check if position is within map bounds
  const isValid = position.x >= 0 && position.x <= mapWidth && position.y >= 0 && position.y <= mapHeight;
  
  if (!isValid) {
    console.log('[BoundsValidation] Position is outside map bounds');
  }

  return isValid;
}

/**
 * Clamp a position to be within map boundaries
 * @param position Position to clamp
 * @param mapData Map data containing resolution information
 * @returns Position clamped to map boundaries
 */
export function clampPositionToBounds(
  position: Point,
  mapData: IMapResponse | null
): Point {
  if (!mapData?.uvtt?.resolution?.map_size) {
    return position; // No bounds data, return original position
  }

  const { map_size } = mapData.uvtt.resolution;
  const mapWidth = map_size.x;
  const mapHeight = map_size.y;

  return {
    x: Math.max(0, Math.min(position.x, mapWidth)),
    y: Math.max(0, Math.min(position.y, mapHeight))
  };
} 