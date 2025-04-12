import { z } from 'zod';
import { assetSchema } from './asset.schema.mjs';
import { baseSchema } from './base.schema.mjs';

// Base Actor schema
export const actorSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  avatar: assetSchema.optional(),
  token: assetSchema.optional(),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  data: z.record(z.any()).optional()
});

// Schema for actor data used in creation
export type IActor = z.infer<typeof actorSchema>;

// Create data schema (makes id, createdBy, and updatedBy optional)
// export const actorCreateSchema = actorSchema
//   .omit({
//     id: true,
//     createdBy: true,
//     updatedBy: true,
//   });

// export type IActorCreateData = z.infer<typeof actorCreateSchema>;

// // Update data schema (makes all fields optional except updatedBy)
// export const actorUpdateSchema = actorSchema
//   .omit({
//     id: true,
//     createdBy: true
//   })
//   .partial()

// export type IActorUpdateData = z.infer<typeof actorUpdateSchema>; 