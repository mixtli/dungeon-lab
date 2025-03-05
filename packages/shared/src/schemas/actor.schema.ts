import { z } from '../lib/zod.js';
import { zId } from '@zodyac/zod-mongoose';

// Base Actor schema
export const actorSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  img: z.string().url().optional(),
  description: z.string().optional(),
  gameSystemId: zId('GameSystem'),
  data: z.record(z.string(), z.unknown()),
  createdBy: zId('User'),
  updatedBy: zId('User'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create data schema (omits auto-generated fields)
export const actorCreateSchema = actorSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// Update data schema (makes all fields optional except id)
export const actorUpdateSchema = actorSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true,
    gameSystemId: true,
  })
  .partial();

// Export types generated from the schemas
export type Actor = z.infer<typeof actorSchema>;
export type ActorCreateData = z.infer<typeof actorCreateSchema>;
export type ActorUpdateData = z.infer<typeof actorUpdateSchema>; 