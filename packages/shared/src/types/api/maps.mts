import { z } from 'zod';
import { mapSchema, mapCreateSchema } from '../../schemas/map.schema.mjs';
import { baseAPIResponseSchema } from './base.mts';

// Base map schema (common properties) that matches the service/DB model

// Types for GET /maps (Get all maps)
export const getMapsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(mapSchema)
});

export type GetMapsResponse = z.infer<typeof getMapsResponseSchema>;

// Types for GET /maps/:id (Get one map)
export const getMapResponseSchema = baseAPIResponseSchema.extend({
  data: mapSchema.optional()
});

export type GetMapResponse = z.infer<typeof getMapResponseSchema>;

// Types for POST /maps (Create map)
export const createMapRequestSchema = mapCreateSchema;

export type CreateMapRequest = z.infer<typeof mapCreateSchema>;

export const createMapResponseSchema = baseAPIResponseSchema.extend({
  data: mapSchema.optional()
});

export type CreateMapResponse = z.infer<typeof createMapResponseSchema>;

// Types for PUT /maps/:id (Replace map)
export const putMapRequestSchema = createMapRequestSchema;
export type PutMapRequest = z.infer<typeof putMapRequestSchema>;

export const putMapResponseSchema = baseAPIResponseSchema.extend({
  data: mapSchema.optional()
});

export type PutMapResponse = z.infer<typeof putMapResponseSchema>;

// Types for PATCH /maps/:id (Update map partially)
export const patchMapRequestSchema = createMapRequestSchema.partial();
export type PatchMapRequest = z.infer<typeof patchMapRequestSchema>;

export const patchMapResponseSchema = putMapResponseSchema;
export type PatchMapResponse = z.infer<typeof patchMapResponseSchema>;

// Types for DELETE /maps/:id (Delete map)
export const deleteMapResponseSchema = baseAPIResponseSchema.extend({
  data: z.undefined()
});

export type DeleteMapResponse = z.infer<typeof deleteMapResponseSchema>;

// Types for POST /maps/:id/image (Upload map image)
export const uploadMapImageResponseSchema = baseAPIResponseSchema.extend({
  data: mapSchema.optional()
});

export type UploadMapImageResponse = z.infer<typeof uploadMapImageResponseSchema>;

// Types for GET /maps/search (Search maps)
export const searchMapsQuerySchema = z
  .object({
    name: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchMapsQuery = z.infer<typeof searchMapsQuerySchema>;

export const searchMapsResponseSchema = getMapsResponseSchema;
export type SearchMapsResponse = z.infer<typeof searchMapsResponseSchema>;

// Types for POST /maps/:id/generate-image (Generate map image)
export const generateMapImageResponseSchema = baseAPIResponseSchema;

export type GenerateMapImageResponse = z.infer<typeof generateMapImageResponseSchema>;
