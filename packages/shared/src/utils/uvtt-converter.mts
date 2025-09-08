import { z } from 'zod';
import { nanoid } from 'nanoid';
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
 * Convert UVTT grid coordinates to world coordinates (inverse of worldToGrid)
 */
function gridToWorld(gridX: number, gridY: number, gridSize: number): { x: number; y: number } {
  return {
    x: gridX * gridSize,
    y: gridY * gridSize
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

// ============================================================================
// INVERSE CONVERSION FUNCTIONS - UVTT TO INTERNAL FORMAT
// ============================================================================

/**
 * Convert UVTT line_of_sight to internal walls format
 * Each line segment becomes a wall with start/end coordinates in world units
 */
function convertLineOfSightToWalls(lineOfSight: Array<Array<{x: number, y: number}>>, gridSize: number): WallData[] {
  return lineOfSight.map(line => {
    if (line.length < 2) {
      throw new Error('Invalid line_of_sight segment: must have at least 2 points');
    }
    
    const start = gridToWorld(line[0].x, line[0].y, gridSize);
    const end = gridToWorld(line[1].x, line[1].y, gridSize);
    
    return {
      id: nanoid(), // Generate unique ID
      tags: [],
      material: 'stone' as const,
      height: 10, // Default height
      start: { x: start.x, y: start.y, z: 0 },
      end: { x: end.x, y: end.y, z: 0 },
      thickness: 5, // Default thickness
      blocksMovement: true,
      blocksLight: true,
      blocksSound: true,
      transparency: 0,
      oneWayVision: false,
      destructible: false
    };
  });
}

/**
 * Convert UVTT objects_line_of_sight to internal objects format
 * Each polygon becomes an object that blocks movement and light
 */
function convertObjectsLineOfSightToObjects(objectsLineOfSight: Array<Array<{x: number, y: number}>>, gridSize: number): ObjectData[] {
  return objectsLineOfSight.map((polygon, index) => {
    const bounds = polygon.map(point => gridToWorld(point.x, point.y, gridSize));
    
    return {
      id: `imported-object-${index}`, // Generate unique ID
      type: 'other' as const,
      tags: [],
      bounds,
      height: 10, // Default height
      color: '#808080', // Default gray color
      opacity: 1.0,
      position: { x: bounds[0]?.x || 0, y: bounds[0]?.y || 0, z: 0 },
      blocksMovement: true,
      blocksLight: true,
      blocksSound: false,
      rotation: 0,
      shapeType: 'polygon' as const,
      interactable: false,
      searchable: false,
      moveable: false
    };
  });
}

/**
 * Convert UVTT portals to internal doors format
 * Each portal becomes a door with coordinates from its bounds
 */
function convertPortalsToDoors(portals: UVTTPortal[], gridSize: number): DoorData[] {
  return portals.map((portal, index) => {
    if (portal.bounds.length < 2) {
      throw new Error('Invalid portal bounds: must have at least 2 points');
    }
    
    const start = gridToWorld(portal.bounds[0].x, portal.bounds[0].y, gridSize);
    const end = gridToWorld(portal.bounds[1].x, portal.bounds[1].y, gridSize);
    
    return {
      id: `imported-door-${index}`, // Generate unique ID
      tags: [],
      material: 'wood' as const,
      state: portal.closed ? 'closed' : 'open',
      coords: [start.x, start.y, end.x, end.y],
      stroke: '#8B4513', // Brown color for door
      strokeWidth: 2,
      requiresKey: false
    };
  });
}

/**
 * Convert UVTT lights to internal lights format
 */
function convertUVTTLightsToLights(lights: UVTTLight[], gridSize: number): LightData[] {
  return lights.map((light, index) => {
    const position = gridToWorld(light.position.x, light.position.y, gridSize);
    
    // Convert range from grid units back to world units
    const range = light.range * gridSize;
    
    // Convert color format (remove alpha and add # prefix)
    const color = '#' + light.color.substring(0, 6);
    
    return {
      id: `imported-light-${index}`, // Generate unique ID
      type: 'point' as const,
      tags: [],
      color,
      position: { x: position.x, y: position.y, z: 0 },
      brightRadius: range * 0.5, // Estimate bright radius as half the total range
      dimRadius: range,
      intensity: light.intensity || 1.0,
      shadows: light.shadows !== false, // Default to true if not specified
      shadowQuality: 'medium' as const,
      falloffType: 'quadratic' as const,
      animation: {
        type: 'none' as const,
        intensity: 0,
        speed: 0
      },
      enabled: true,
      controllable: false
    };
  });
}

/**
 * Convert UVTT environment to internal environment format
 */
function convertUVTTEnvironmentToEnvironment(environment: UVTTEnvironment): EnvironmentData {
  // Convert ambient light color (add # prefix)
  const ambientColor = '#' + environment.ambient_light;
  
  return {
    globalIllumination: environment.baked_lighting || false,
    ambientLight: {
      color: ambientColor,
      intensity: 0.2 // Default ambient intensity
    },
    audio: {
      reverbLevel: 0.2,
      soundOcclusion: true
    },
    weather: {
      type: 'none' as const,
      intensity: 0,
      windDirection: 0,
      windSpeed: 0,
      visibility: 100
    },
    darkvisionRange: 60, // Default darkvision range
    atmosphere: {
      fogColor: '#FFFFFF',
      fogDensity: 0
    }
  };
}

/**
 * Main conversion function: Convert UVTT data to internal map data format
 */
export function convertUVTTToMapData(uvttData: UVTTData): InternalMapData {
  // Extract grid size from UVTT resolution
  const gridSize = uvttData.resolution?.pixels_per_grid || 100; // Default fallback
  const width = uvttData.resolution?.map_size?.x || 50; // Default fallback
  const height = uvttData.resolution?.map_size?.y || 50; // Default fallback
  
  // Convert all elements from grid coordinates to world coordinates
  const walls = uvttData.line_of_sight ? convertLineOfSightToWalls(uvttData.line_of_sight, gridSize) : [];
  const objects = uvttData.objects_line_of_sight ? convertObjectsLineOfSightToObjects(uvttData.objects_line_of_sight, gridSize) : [];
  const doors = uvttData.portals ? convertPortalsToDoors(uvttData.portals, gridSize) : [];
  const lights = uvttData.lights ? convertUVTTLightsToLights(uvttData.lights, gridSize) : [];
  const environment = uvttData.environment ? 
    convertUVTTEnvironmentToEnvironment(uvttData.environment) : 
    {
      globalIllumination: false,
      ambientLight: { color: '#ffffff', intensity: 0.2 },
      audio: {
        reverbLevel: 0.2,
        soundOcclusion: true
      },
      weather: {
        type: 'none' as const,
        intensity: 0,
        windDirection: 0,
        windSpeed: 0,
        visibility: 100
      },
      darkvisionRange: 60, // Default darkvision range
      atmosphere: {
        fogColor: '#FFFFFF',
        fogDensity: 0
      }
    };
  
  // Build the internal map data structure
  const mapData: InternalMapData = {
    version: '1.0.0',
    coordinates: {
      worldUnitsPerGridCell: gridSize,
      offset: { x: 0, y: 0 },
      dimensions: { width, height },
      imageDimensions: { width: width * gridSize, height: height * gridSize },
      display: {
        visible: true,
        color: '#000000',
        opacity: 0.5,
        lineWidth: 1
      }
    },
    walls,
    terrain: [], // No terrain data in UVTT format
    objects,
    regions: [], // No regions data in UVTT format
    doors,
    lights,
    environment,
    semanticData: {
      mapType: 'other' as const,
      keywords: []
    },
    conversionSettings: {
      defaultPolygonPrecision: 10,
      useAdaptivePrecision: false,
      targetSegmentLength: 50
    }
  };
  
  // Validate the generated map data against the schema
  return internalMapDataSchema.parse(mapData);
}