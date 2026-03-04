import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

// ============================================================================
// GEOMETRY PRIMITIVES
// ============================================================================

/** 2D coordinate on the XZ ground plane */
export const vec2Schema = z.object({
  x: z.number(),
  z: z.number()
});

/** 3D coordinate */
export const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});

/** 3D transform (position, rotation, scale) */
export const transformSchema = z.object({
  position: vec3Schema,
  rotation: vec3Schema,
  scale: vec3Schema
});

// ============================================================================
// MATERIALS
// ============================================================================

export const materialDefSchema = z.object({
  color: z.string(),
  textureRef: z.string().optional(),
  roughness: z.number(),
  metalness: z.number(),
  tilingX: z.number(),
  tilingY: z.number()
});

export const materialPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  material: materialDefSchema
});

// ============================================================================
// BLOCKING & GRID
// ============================================================================

export const blockingModeSchema = z.enum(['full', 'half', 'none']);

export const gridConfigSchema = z.object({
  type: z.enum(['square', 'hex']),
  cellSize: z.number().default(1), // world units, default 1 = 5ft
  visible: z.boolean().default(true),
  color: z.string().default('#444444'),
  opacity: z.number().min(0).max(1).default(0.3)
});

// ============================================================================
// LAYERS
// ============================================================================

export const layerSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  order: z.number().default(0)
});

// ============================================================================
// MAP ELEMENTS
// ============================================================================

export const terrainElementSchema = z.object({
  id: z.string(),
  type: z.literal('terrain'),
  layerId: z.string(),
  position: vec3Schema,
  widthCells: z.number(),
  depthCells: z.number(),
  elevation: z.number().default(0),
  material: materialDefSchema
});

export const wallElementSchema = z.object({
  id: z.string(),
  type: z.literal('wall'),
  layerId: z.string(),
  start: vec2Schema,
  end: vec2Schema,
  height: z.number().default(3),
  thickness: z.number().default(0.1),
  elevation: z.number().default(0),
  material: materialDefSchema,
  blockVision: blockingModeSchema.default('full'),
  blockMovement: blockingModeSchema.default('full'),
  blockLight: blockingModeSchema.default('full')
});

export const propElementSchema = z.object({
  id: z.string(),
  type: z.literal('prop'),
  layerId: z.string(),
  transform: transformSchema,
  assetRef: z.string(),
  castShadow: z.boolean().default(true),
  receiveShadow: z.boolean().default(true)
});

export const lightTypeSchema = z.enum(['point', 'spot', 'ambient']);

export const lightElementSchema = z.object({
  id: z.string(),
  type: z.literal('light'),
  layerId: z.string(),
  lightType: lightTypeSchema,
  position: vec3Schema,
  color: z.string().default('#ffffff'),
  intensity: z.number().default(1),
  brightRange: z.number().default(6),
  dimRange: z.number().default(12),
  castShadow: z.boolean().default(false)
});

export const portalKindSchema = z.enum(['door', 'window', 'archway', 'secret', 'trapdoor']);
export const portalStateSchema = z.enum(['open', 'closed', 'locked']);

export const portalElementSchema = z.object({
  id: z.string(),
  type: z.literal('portal'),
  layerId: z.string(),
  kind: portalKindSchema,
  state: portalStateSchema.default('closed'),
  wallId: z.string(),
  position: z.number().min(0).max(1), // 0-1 along the wall
  width: z.number().default(1),
  height: z.number().default(2)
});

/** Discriminated union of all map element types */
export const mapElementSchema = z.discriminatedUnion('type', [
  terrainElementSchema,
  wallElementSchema,
  propElementSchema,
  lightElementSchema,
  portalElementSchema
]);

// ============================================================================
// ENVIRONMENT
// ============================================================================

export const environmentConfigSchema = z.object({
  ambientColor: z.string().default('#ffffff'),
  ambientIntensity: z.number().min(0).default(0.4),
  directionalColor: z.string().default('#ffffff'),
  directionalIntensity: z.number().min(0).default(0.6),
  fogEnabled: z.boolean().default(false),
  fogColor: z.string().default('#000000'),
  fogNear: z.number().default(10),
  fogFar: z.number().default(50),
  backgroundColor: z.string().default('#1a1a2e'),
  globalIllumination: z.boolean().default(true)
});

export const environmentPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  environment: environmentConfigSchema
});

// ============================================================================
// DUNGEON MAP DATA (replaces internalMapDataSchema)
// ============================================================================

export const dungeonMapDataSchema = z.object({
  grid: gridConfigSchema.default({
    type: 'square',
    cellSize: 1,
    visible: true,
    color: '#444444',
    opacity: 0.3
  }),
  environment: environmentConfigSchema.default({
    ambientColor: '#ffffff',
    ambientIntensity: 0.4,
    directionalColor: '#ffffff',
    directionalIntensity: 0.6,
    fogEnabled: false,
    fogColor: '#000000',
    fogNear: 10,
    fogFar: 50,
    backgroundColor: '#1a1a2e',
    globalIllumination: true
  }),
  layers: z.array(layerSchema).default([
    { id: 'default', name: 'Default', visible: true, locked: false, order: 0 }
  ]),
  elements: z.array(mapElementSchema).default([])
});

// ============================================================================
// MAP DOCUMENT SCHEMAS
// ============================================================================

/** Base Map schema */
export const mapSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  thumbnailId: z.string().optional(),
  imageId: z.string().optional(),
  mapData: dungeonMapDataSchema
});

/** Map schema with virtual fields (populated assets) */
export const mapSchemaWithVirtuals = mapSchema.extend({
  thumbnail: assetSchema.nullable().optional(),
  image: assetSchema.nullable().optional()
});

/** Schema for map creation */
export const mapCreateSchema = mapSchema
  .omit({ id: true })
  .extend({
    image: z.any().optional(),
    mapData: dungeonMapDataSchema.optional()
  });
