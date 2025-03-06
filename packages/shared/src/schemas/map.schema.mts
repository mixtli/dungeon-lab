import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Base Map schema
export const mapSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  gridColumns: z.number().int().positive(),
  gridRows: z.number().int().positive(),
  aspectRatio: z.number().positive(),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const mapCreateSchema = mapSchema.omit({
  imageUrl: true,
  thumbnailUrl: true,
  gridRows: true,
  aspectRatio: true,
  createdBy: true,
  updatedBy: true,
}).extend({
  image: z.instanceof(File), // Client-side only
});

// Update data schema (makes all fields optional except updatedBy)
export const mapUpdateSchema = mapSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types generated from the schemas
export type IMap = z.infer<typeof mapSchema> & ApiFields;
export type IMapCreateData = z.infer<typeof mapCreateSchema>;
export type IMapUpdateData = z.infer<typeof mapUpdateSchema>; 