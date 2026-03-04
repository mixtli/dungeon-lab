import { z } from 'zod';
import {
  mapSchema,
  mapSchemaWithVirtuals,
  mapCreateSchema,
  dungeonMapDataSchema,
  vec2Schema,
  vec3Schema,
  transformSchema,
  materialDefSchema,
  gridConfigSchema,
  layerSchema,
  terrainElementSchema,
  wallElementSchema,
  propElementSchema,
  lightElementSchema,
  portalElementSchema,
  mapElementSchema,
  environmentConfigSchema
} from '../schemas/map.schema.mjs';
import {
  mapImportUVTTSchema,
  uvttSchema,
  uvttPortalSchema as portalSchema,
  uvttLightSchema as lightSchema,
} from '../schemas/uvtt-import-export.schema.mjs';

// Map document types
export type Map = z.infer<typeof mapSchema>;
export type MapWithVirtuals = z.infer<typeof mapSchemaWithVirtuals>;
export type MapCreate = z.infer<typeof mapCreateSchema>;
export type DungeonMapData = z.infer<typeof dungeonMapDataSchema>;

// Geometry types
export type Vec2 = z.infer<typeof vec2Schema>;
export type Vec3 = z.infer<typeof vec3Schema>;
export type Transform = z.infer<typeof transformSchema>;

// Material types
export type MaterialDef = z.infer<typeof materialDefSchema>;

// Grid & Layer types
export type GridConfig = z.infer<typeof gridConfigSchema>;
export type Layer = z.infer<typeof layerSchema>;

// Element types
export type TerrainElement = z.infer<typeof terrainElementSchema>;
export type WallElement = z.infer<typeof wallElementSchema>;
export type PropElement = z.infer<typeof propElementSchema>;
export type LightElement = z.infer<typeof lightElementSchema>;
export type PortalElement = z.infer<typeof portalElementSchema>;
export type MapElement = z.infer<typeof mapElementSchema>;

// Environment types
export type EnvironmentConfig = z.infer<typeof environmentConfigSchema>;

// UVTT types (kept for import/export compatibility)
export type MapImportUVTT = z.infer<typeof mapImportUVTTSchema>;
export type UVTT = z.infer<typeof uvttSchema>;
export type UVTTLight = z.infer<typeof lightSchema>;
export type UVTTPortal = z.infer<typeof portalSchema>;
