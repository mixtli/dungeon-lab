import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';

export interface Point {
  x: number;
  y: number;
}

/**
 * Check if a position is within the map boundaries
 * @param position Position to check (in world coordinates)
 * @param mapData Map data containing grid configuration
 * @returns true if position is valid (within bounds), false if outside bounds
 *
 * Note: The new 3D map schema does not have explicit grid dimensions.
 * Bounds validation will be re-implemented when the 3D map system is complete.
 * For now, we only validate non-negative positions.
 */
export function isPositionWithinBounds(
  position: Point,
  _mapData: IMapResponse | null
): boolean {
  // Basic non-negative check
  const isValid = position.x >= 0 && position.y >= 0;

  if (!isValid) {
    console.log('[BoundsValidation] Position is negative, outside bounds');
  }

  return isValid;
}

/**
 * Clamp a position to be within map boundaries
 * @param position Position to clamp
 * @param mapData Map data containing grid configuration
 * @returns Position clamped to map boundaries
 *
 * Note: The new 3D map schema does not have explicit grid dimensions.
 * Bounds clamping will be re-implemented when the 3D map system is complete.
 * For now, we only clamp to non-negative values.
 */
export function clampPositionToBounds(
  position: Point,
  _mapData: IMapResponse | null
): Point {
  return {
    x: Math.max(0, position.x),
    y: Math.max(0, position.y)
  };
} 