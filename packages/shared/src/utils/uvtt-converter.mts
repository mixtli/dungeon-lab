import { z } from 'zod';
import { 
  internalMapDataSchema,
  wallSchema,
  mapObjectSchema,
  doorSchema,
  enhancedLightSchema,
  enhancedEnvironmentSchema
} from '../schemas/map.schema.mjs';
import {
  uvttSchema,
  type UVTTData,
  type UVTTPortal,
  type UVTTLight,
  type UVTTEnvironment
} from '../schemas/uvtt-import-export.schema.mjs';

// Type aliases for better readability
type InternalMapData = z.infer<typeof internalMapDataSchema>;
type WallData = z.infer<typeof wallSchema>;
type ObjectData = z.infer<typeof mapObjectSchema>;
type DoorData = z.infer<typeof doorSchema>;
type LightData = z.infer<typeof enhancedLightSchema>;
type EnvironmentData = z.infer<typeof enhancedEnvironmentSchema>;

/**
 * Convert world coordinates to UVTT grid coordinates
 */
function worldToGrid(worldX: number, worldY: number, gridSize: number): { x: number; y: number } {
  return {
    x: worldX / gridSize,
    y: worldY / gridSize
  };
}

/**
 * Convert walls from internal format to UVTT line_of_sight format
 * Each wall becomes a line segment in grid coordinates
 */
function convertWallsToLineOfSight(walls: WallData[], gridSize: number): Array<Array<{x: number, y: number}>> {
  return walls.map(wall => {
    const startGrid = worldToGrid(wall.start.x, wall.start.y, gridSize);
    const endGrid = worldToGrid(wall.end.x, wall.end.y, gridSize);
    
    return [
      startGrid,
      endGrid
    ];
  });
}

/**
 * Convert objects that block movement/sight to UVTT objects_line_of_sight format
 * Only includes objects that block movement or light
 */
function convertObjectsToLineOfSight(objects: ObjectData[], gridSize: number): Array<Array<{x: number, y: number}>> {
  return objects
    .filter(obj => obj.blocksMovement || obj.blocksLight)
    .map(obj => {
      // Convert polygon bounds to grid coordinates
      return obj.bounds.map(point => {
        return worldToGrid(point.x, point.y, gridSize);
      });
    });
}

/**
 * Convert doors from internal format to UVTT portals format
 * Doors are line segments that become portals in UVTT
 */
function convertDoorsToPortals(doors: DoorData[], gridSize: number): UVTTPortal[] {
  return doors.map(door => {
    // Door coords are [x1, y1, x2, y2] in world units
    const [x1, y1, x2, y2] = door.coords;
    
    // Convert to grid coordinates
    const start = worldToGrid(x1, y1, gridSize);
    const end = worldToGrid(x2, y2, gridSize);
    
    // Calculate center position for the portal
    const position = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };
    
    // Create bounds as a line segment
    const bounds = [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y }
    ];
    
    return {
      position,
      bounds,
      rotation: 0, // TODO: Calculate rotation from door orientation if needed
      closed: door.state !== 'open',
      freestanding: false // Doors are typically not freestanding
    };
  });
}

/**
 * Convert lights from internal format to UVTT lights format
 */
function convertLightsToUVTT(lights: LightData[], gridSize: number): UVTTLight[] {
  return lights.map(light => {
    const position = worldToGrid(light.position.x, light.position.y, gridSize);
    
    // Convert light range from world units to grid units
    const range = Math.max(light.brightRadius, light.dimRadius) / gridSize;
    
    // Convert color format (remove alpha channel if present)
    const color = light.color.replace(/^#/, '').substring(0, 6);
    
    return {
      position,
      range,
      intensity: light.intensity,
      color: color + 'ff', // Add full alpha for UVTT format (RRGGBBAA)
      shadows: light.shadows
    };
  });
}

/**
 * Convert environment settings from internal format to UVTT environment format
 */
function convertEnvironmentToUVTT(environment: EnvironmentData): UVTTEnvironment {
  // Convert ambient light color (remove # prefix)
  const ambientLight = environment.ambientLight.color.replace(/^#/, '');
  
  return {
    baked_lighting: environment.globalIllumination || false,
    ambient_light: ambientLight
  };
}

/**
 * Main conversion function: Convert internal map data to UVTT format
 */
export function convertMapDataToUVTT(mapData: InternalMapData, imageBase64?: string): UVTTData {
  const gridSize = mapData.coordinates.worldUnitsPerGridCell;
  const { width, height } = mapData.coordinates.dimensions;
  
  // Build the UVTT data structure
  const uvttData: UVTTData = {
    format: 1.0,
    resolution: {
      map_origin: { x: 0, y: 0 }, // Always start at origin
      map_size: { x: width, y: height }, // Grid dimensions
      pixels_per_grid: gridSize // World units per grid cell
    },
    line_of_sight: convertWallsToLineOfSight(mapData.walls, gridSize),
    objects_line_of_sight: convertObjectsToLineOfSight(mapData.objects, gridSize),
    portals: convertDoorsToPortals(mapData.doors, gridSize),
    lights: convertLightsToUVTT(mapData.lights, gridSize),
    environment: convertEnvironmentToUVTT(mapData.environment),
    image: imageBase64
  };
  
  // Validate the generated UVTT data against the schema
  return uvttSchema.parse(uvttData);
}

/**
 * Helper function to convert a base64 data URL to just the base64 content
 * Removes the "data:image/...;base64," prefix if present
 */
export function cleanBase64Image(base64DataUrl: string): string {
  if (base64DataUrl.startsWith('data:')) {
    const commaIndex = base64DataUrl.indexOf(',');
    return commaIndex !== -1 ? base64DataUrl.substring(commaIndex + 1) : base64DataUrl;
  }
  return base64DataUrl;
}