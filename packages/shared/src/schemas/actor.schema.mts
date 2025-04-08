import { z } from '../lib/zod.mjs';

// Base Actor schema
export const actorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  avatar: z.string().url().optional(),
  token: z.string().url().optional(),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  data: z.any(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

// Create data schema (omits auto-generated fields)
export const actorCreateSchema = actorSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
});

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

// Export types generated from the schemas
export type IActor = z.infer<typeof actorSchema>;
export type IActorCreateData = z.infer<typeof actorCreateSchema>;
export type IActorUpdateData = z.infer<typeof actorUpdateSchema>; 