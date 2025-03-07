import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Base Actor schema
export const actorSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  avatar: z.string().url().optional(),
  token: z.string().url().optional(),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  data: z.any(),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const actorCreateSchema = actorSchema.omit({
  createdBy: true,
  updatedBy: true,
});

// Update data schema (makes all fields optional except updatedBy)
export const actorUpdateSchema = actorSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types generated from the schemas
export type IActor = z.infer<typeof actorSchema> & ApiFields;
export type IActorCreateData = z.infer<typeof actorCreateSchema>;
export type IActorUpdateData = z.infer<typeof actorUpdateSchema>; 