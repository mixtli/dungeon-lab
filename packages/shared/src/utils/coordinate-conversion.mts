/**
 * Coordinate conversion utilities for compatibility between world coordinates and UVTT format
 */

import type { Point, MapMetadata, UVTTData } from '../types/mapEditor.mjs';

/**
 * Legacy UVTT resolution structure
 */
export interface UVTTResolution {
  map_origin: Point;
  map_size: { x: number; y: number };
  pixels_per_grid: number;
}

/**
 * Convert UVTT resolution to world coordinate system
 */
export function uvttToWorldCoordinates(uvttRes: UVTTResolution, imageWidth: number, imageHeight: number): MapMetadata['coordinates'] {
  return {
    worldUnitsPerGridCell: uvttRes.pixels_per_grid,
    offset: { x: uvttRes.map_origin.x, y: uvttRes.map_origin.y },
    dimensions: {
      width: uvttRes.map_size.x,
      height: uvttRes.map_size.y
    },
    imageDimensions: {
      width: imageWidth,
      height: imageHeight
    }
  };
}

/**
 * Convert world coordinate system to UVTT resolution format
 */
export function worldCoordinatesToUVTT(coords: MapMetadata['coordinates']): UVTTResolution {
  return {
    map_origin: { x: coords.offset.x, y: coords.offset.y },
    map_size: { 
      x: coords.dimensions.width, 
      y: coords.dimensions.height 
    },
    pixels_per_grid: coords.worldUnitsPerGridCell
  };
}

/**
 * Convert grid coordinates to world coordinates
 */
export function gridToWorld(gridCoord: Point, worldUnitsPerGridCell: number, offset: Point = { x: 0, y: 0 }): Point {
  return {
    x: (gridCoord.x * worldUnitsPerGridCell) + offset.x,
    y: (gridCoord.y * worldUnitsPerGridCell) + offset.y
  };
}

/**
 * Convert world coordinates to grid coordinates
 */
export function worldToGrid(worldCoord: Point, worldUnitsPerGridCell: number, offset: Point = { x: 0, y: 0 }): Point {
  return {
    x: (worldCoord.x - offset.x) / worldUnitsPerGridCell,
    y: (worldCoord.y - offset.y) / worldUnitsPerGridCell
  };
}

/**
 * Snap world coordinates to grid
 */
export function snapToWorldGrid(worldCoord: Point, worldUnitsPerGridCell: number, offset: Point = { x: 0, y: 0 }): Point {
  const gridCoord = worldToGrid(worldCoord, worldUnitsPerGridCell, offset);
  const snappedGrid = {
    x: Math.round(gridCoord.x),
    y: Math.round(gridCoord.y)
  };
  return gridToWorld(snappedGrid, worldUnitsPerGridCell, offset);
}

/**
 * Convert a flat array of world coordinates for snapping
 * Used for wall points [x1, y1, x2, y2, ...]
 */
export function snapPointsArrayToWorldGrid(
  points: number[], 
  worldUnitsPerGridCell: number, 
  offset: Point = { x: 0, y: 0 }
): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < points.length; i += 2) {
    const worldPoint = { x: points[i], y: points[i + 1] };
    const snapped = snapToWorldGrid(worldPoint, worldUnitsPerGridCell, offset);
    result.push(snapped.x, snapped.y);
  }
  
  return result;
}

/**
 * Calculate grid dimensions that fit within image bounds
 * Useful for initializing maps with appropriate grid sizes
 */
export function calculateOptimalGridDimensions(
  imageWidth: number, 
  imageHeight: number, 
  targetWorldUnitsPerCell: number = 50
): { dimensions: { width: number; height: number }; worldUnitsPerGridCell: number } {
  const gridWidth = Math.ceil(imageWidth / targetWorldUnitsPerCell);
  const gridHeight = Math.ceil(imageHeight / targetWorldUnitsPerCell);
  
  // Adjust worldUnitsPerGridCell to fit image exactly
  const actualWorldUnitsPerCell = Math.max(
    imageWidth / gridWidth,
    imageHeight / gridHeight
  );
  
  return {
    dimensions: { width: gridWidth, height: gridHeight },
    worldUnitsPerGridCell: actualWorldUnitsPerCell
  };
}

/**
 * Validate that coordinates are within bounds
 */
export function isPointWithinBounds(point: Point, imageDimensions: { width: number; height: number }): boolean {
  return point.x >= 0 && 
         point.x <= imageDimensions.width && 
         point.y >= 0 && 
         point.y <= imageDimensions.height;
}

/**
 * Convert legacy UVTT map data to new schema format
 */
export function convertUVTTToNewSchema(uvttData: UVTTData, imageWidth: number, imageHeight: number): Partial<MapMetadata> {
  const coordinates = uvttData.resolution 
    ? uvttToWorldCoordinates(uvttData.resolution, imageWidth, imageHeight)
    : calculateOptimalGridDimensions(imageWidth, imageHeight).dimensions && {
        worldUnitsPerGridCell: 50,
        offset: { x: 0, y: 0 },
        dimensions: calculateOptimalGridDimensions(imageWidth, imageHeight).dimensions,
        imageDimensions: { width: imageWidth, height: imageHeight }
      };

  return {
    coordinates: coordinates!,
    environment: {
      ambientLight: {
        color: uvttData.environment?.ambient_light || '#ffffff',
        intensity: 0.1
      },
      globalIllumination: uvttData.environment?.baked_lighting || false
    },
    // Keep original UVTT data for backward compatibility
    uvtt: {
      format: uvttData.format || 1.0,
      resolution: uvttData.resolution || {
        map_origin: { x: 0, y: 0 },
        map_size: { x: 30, y: 30 },
        pixels_per_grid: 50
      }
    }
  };
}