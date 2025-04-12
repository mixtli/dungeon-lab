import { z } from 'zod';
import { assetSchema } from './asset.schema.mjs';
import { baseSchema } from './base.schema.mjs';

// Base Map schema
export const mapSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  image: assetSchema,
  thumbnail: assetSchema.optional(),
  gridColumns: z.number().int().positive(),
  gridRows: z.number().int().positive(),
  aspectRatio: z.number().positive(),
});

// Create data schema (omits auto-generated fields)
// export const mapCreateSchema = mapSchema.omit({
//   id: true,
//   gridRows: true,
//   aspectRatio: true,
//   createdBy: true,
//   updatedBy: true,
// }).extend({
//   image: assetSchema.optional()
// });

// // Update data schema (makes all fields optional except updatedBy)
// export const mapUpdateSchema = mapSchema
//   .omit({
//     createdBy: true,
//     updatedBy: true,
//   })
//   .partial()

// Export types generated from the schemas
export type IMap = z.infer<typeof mapSchema>;
// export type IMapCreateData = z.infer<typeof mapCreateSchema>;
// export type IMapUpdateData = z.infer<typeof mapUpdateSchema>; 