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
  if (!mapData?.mapData?.coordinates?.dimensions) {
    console.log('[BoundsValidation] No map size data available, allowing movement');
    return true; // No bounds data, allow movement
  }

  const mapWidth = mapData.mapData.coordinates.dimensions.width;
  const mapHeight = mapData.mapData.coordinates.dimensions.height;

  // Convert world pixel coordinates to grid coordinates for bounds checking
  const pixelsPerGrid = mapData.mapData.coordinates.worldUnitsPerGridCell || 50;
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
  if (!mapData?.mapData?.coordinates?.dimensions) {
    return position; // No bounds data, return original position
  }

  const mapWidth = mapData.mapData.coordinates.dimensions.width;
  const mapHeight = mapData.mapData.coordinates.dimensions.height;

  // Convert world pixel coordinates to grid coordinates for clamping
  const pixelsPerGrid = mapData.mapData.coordinates.worldUnitsPerGridCell || 50;
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