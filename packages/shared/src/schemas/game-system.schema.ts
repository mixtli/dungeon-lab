import { z } from '../lib/zod.js';
import { zId } from '@zodyac/zod-mongoose';

// Game System Actor Type schema
export const gameSystemActorTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dataSchema: z.record(z.string(), z.unknown()),
  uiComponent: z.string().optional(),
});

// Game System Item Type schema
export const gameSystemItemTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dataSchema: z.record(z.string(), z.unknown()),
  uiComponent: z.string().optional(),
});

// Base Game System schema
export const gameSystemSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(50),
  description: z.string().optional(),
  author: z.string().optional(),
  website: z.string().url().optional(),
  actorTypes: z.array(gameSystemActorTypeSchema),
  itemTypes: z.array(gameSystemItemTypeSchema),
  createdBy: zId('User'),
  updatedBy: zId('User'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create data schema (omits auto-generated fields)
export const gameSystemCreateSchema = gameSystemSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// Update data schema (makes all fields optional)
export const gameSystemUpdateSchema = gameSystemSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true,
  })
  .partial();

// Export types generated from the schemas
export type GameSystem = z.infer<typeof gameSystemSchema>;
export type GameSystemActorType = z.infer<typeof gameSystemActorTypeSchema>;
export type GameSystemItemType = z.infer<typeof gameSystemItemTypeSchema>;
export type GameSystemCreateData = z.infer<typeof gameSystemCreateSchema>;
export type GameSystemUpdateData = z.infer<typeof gameSystemUpdateSchema>; 