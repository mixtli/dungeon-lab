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

  // Convert world pixel coordinates to grid coordinates for bounds checking
  const pixelsPerGrid = mapData.uvtt.resolution.pixels_per_grid || 50;
  const gridX = position.x / pixelsPerGrid;
  const gridY = position.y / pixelsPerGrid;

  console.log(`[BoundsValidation] Checking position ${JSON.stringify(position)} (pixels) -> grid(${gridX.toFixed(2)}, ${gridY.toFixed(2)}) against map bounds ${mapWidth}x${mapHeight} cells`);

  // Check if grid position is within map bounds (map bounds are in grid cells)
  const isValid = gridX >= 0 && gridX <= mapWidth && gridY >= 0 && gridY <= mapHeight;
  
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

  // Convert world pixel coordinates to grid coordinates for clamping
  const pixelsPerGrid = mapData.uvtt.resolution.pixels_per_grid || 50;
  const gridX = position.x / pixelsPerGrid;
  const gridY = position.y / pixelsPerGrid;

  // Clamp to grid bounds and convert back to world coordinates
  const clampedGridX = Math.max(0, Math.min(gridX, mapWidth));
  const clampedGridY = Math.max(0, Math.min(gridY, mapHeight));

  return {
    x: clampedGridX * pixelsPerGrid,
    y: clampedGridY * pixelsPerGrid
  };
} 