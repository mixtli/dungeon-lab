import { z } from 'zod';

// 2D coordinate (for backward compatibility)
const coordinateSchema = z.object({
  x: z.number(),
  y: z.number()
});

/**
 * Legacy UVTT Portal Schema (for import/export only)
 */
export const uvttPortalSchema = z.object({
  position: coordinateSchema,
  bounds: z.array(coordinateSchema),
  rotation: z.number().default(0),
  closed: z.boolean().default(false),
  freestanding: z.boolean().default(false)
});

/**
 * Legacy UVTT Light Schema (for import/export only)
 */
export const uvttLightSchema = z.object({
  position: coordinateSchema,
  range: z.number().positive().default(30),
  intensity: z.number().min(0).max(1).default(1),
  color: z.string().default('ffffff'), // 8-character hex (RRGGBBAA)
  shadows: z.boolean().default(true)
});

/**
 * Legacy UVTT Environment Schema (for import/export only)
 */
export const uvttEnvironmentSchema = z.object({
  baked_lighting: z.boolean().default(false),
  ambient_light: z.string().default('#ffffff')
});

/**
 * Legacy UVTT Resolution Schema (for import/export only)
 */
export const uvttResolutionSchema = z.object({
  map_origin: coordinateSchema.default({ x: 0, y: 0 }),
  map_size: coordinateSchema,
  pixels_per_grid: z.number().positive().default(50)
});

/**
 * Complete Legacy UVTT Schema (for import/export only)
 */
export const uvttSchema = z.object({
  format: z.union([z.string(), z.number()]).default(1.0),
  resolution: uvttResolutionSchema,
  line_of_sight: z.array(z.array(coordinateSchema)).optional(),
  objects_line_of_sight: z.array(z.array(coordinateSchema)).optional(),
  portals: z.array(uvttPortalSchema).optional(),
  lights: z.array(uvttLightSchema).optional(),
  environment: uvttEnvironmentSchema.optional(),
  image: z.string().optional() // Image URL/path
});

/**
 * Schema specifically for importing UVTT files
 */
export const mapImportUVTTSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  uvttData: uvttSchema,
  file: z.any().optional() // File upload
});

/**
 * Schema for UVTT export requests
 */
export const uvttExportRequestSchema = z.object({
  mapId: z.string(),
  includeAssets: z.boolean().default(true),
  format: z.enum(['json', 'file']).default('json')
});

// Type exports for use in services
export type UVTTData = z.infer<typeof uvttSchema>;
export type UVTTLight = z.infer<typeof uvttLightSchema>;
export type UVTTPortal = z.infer<typeof uvttPortalSchema>;
export type UVTTEnvironment = z.infer<typeof uvttEnvironmentSchema>;
export type UVTTResolution = z.infer<typeof uvttResolutionSchema>;
export type MapImportUVTTRequest = z.infer<typeof mapImportUVTTSchema>;
export type UVTTExportRequest = z.infer<typeof uvttExportRequestSchema>;