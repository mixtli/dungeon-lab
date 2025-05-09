import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

/**
 * Schema for UVTT coordinates
 */
export const coordinateSchema = z.object({
  x: z.number(),
  y: z.number()
});

const polygonSchema = z.array(coordinateSchema);

/**
 * Schema for UVTT resolution
 */
export const resolutionSchema = z.object({
  map_origin: z.object({
    x: z.number().default(0),
    y: z.number().default(0)
  }),
  map_size: z.object({
    x: z.number().positive(),
    y: z.number().positive()
  }),
  pixels_per_grid: z.number().int().positive()
});

/**
 * Schema for UVTT portal
 */
const portalSchema = z.object({
  position: coordinateSchema,
  bounds: z.array(coordinateSchema),
  rotation: z.number(), // in radians
  closed: z.boolean(),
  freestanding: z.boolean()
});

/**
 * Schema for UVTT light
 */
const lightSchema = z.object({
  position: coordinateSchema,
  range: z.number(),
  intensity: z.number(),
  color: z.string(), // hex color code
  shadows: z.boolean()
});

/**
 * Schema for UVTT environment
 */
const environmentSchema = z.object({
  baked_lighting: z.boolean().default(false),
  ambient_light: z.string().default('#ffffff') // hex color code with default white
});

/**
 * Schema for the UVTT format data
 */
export const uvttSchema = z.object({
  format: z.number().default(1.0), // UVTT version
  resolution: resolutionSchema,
  line_of_sight: z.array(polygonSchema).optional(),
  objects_line_of_sight: z.array(polygonSchema).optional(),
  portals: z.array(portalSchema).optional(),
  environment: environmentSchema.optional(),
  lights: z.array(lightSchema).optional()
});

// Base Map schema
export const mapSchema = baseSchema.extend({
  // Standard fields
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  userData: z.record(z.any()).optional(),

  // Direct asset references using string IDs (will be ObjectId in server models via zId)
  thumbnailId: z.string().optional(),
  imageId: z.string().optional(),

  // Grid information
  //gridColumns: z.coerce.number().int().positive(),
  //gridRows: z.coerce.number().int().positive(),
  aspectRatio: z.coerce.number().positive().optional(),

  // UVTT format fields (nested)
  uvtt: uvttSchema.optional(),

  // Additional fields for AI generation
  aiPrompt: z.string().optional(), // Original prompt used to generate the map
  aiModel: z.string().optional(),  // AI model used for generation
  generationVersion: z.number().optional() // Version of the generation for version tracking
});

export const mapSchemaWithVirtuals = mapSchema.extend({
  thumbnail: assetSchema.optional(),
  image: assetSchema.optional()
});

// Schema for map creation that includes an optional image field for validation
export const mapCreateSchema = mapSchema
  .omit({
    id: true,
  })
  .extend({
    // Add an optional field for the image during creation (can be file upload or AI generated)
    image: z.any().optional()
  });

// Schema specifically for importing UVTT files
export const mapImportUVTTSchema = z.object({
  // The file will be processed separately, but we need a field for validation
  uvttFile: z.any(),
  
  // Optionally override some fields during import
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  userData: z.record(z.any()).optional(),
  campaignId: z.string().optional() // Optional campaign to associate with
});
