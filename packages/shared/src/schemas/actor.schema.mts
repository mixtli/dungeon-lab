import { z } from '../lib/zod.mjs';
import { assetSchema } from './asset.schema.mjs';

// Base Actor schema
export const actorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  avatar: assetSchema.optional(),
  token: assetSchema.optional(),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  data: z.any(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

// Schema for actor data used in creation
export type IActor = z.infer<typeof actorSchema>;

// Create data schema (makes id, createdBy, and updatedBy optional)
export const actorCreateSchema = actorSchema
  .omit({
    id: true,
    createdBy: true,
    updatedBy: true,
  });

export type IActorCreateData = z.infer<typeof actorCreateSchema>;

// Update data schema (makes all fields optional except updatedBy)
export const actorUpdateSchema = actorSchema
  .omit({
    id: true,
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: z.string(),
  });

export type IActorUpdateData = z.infer<typeof actorUpdateSchema>; 