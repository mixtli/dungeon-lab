import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Game System Actor Type schema
export const gameSystemActorTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dataSchema: z.instanceof(z.ZodType),
  uiComponent: z.string().optional(),
});

// Game System Item Type schema
export const gameSystemItemTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dataSchema: z.instanceof(z.ZodType),
  uiComponent: z.string().optional(),
});

// Base Game System schema
export const gameSystemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.string(),
  actorTypes: z.array(gameSystemActorTypeSchema),
  itemTypes: z.array(gameSystemItemTypeSchema),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const gameSystemCreateSchema = gameSystemSchema.omit({
  createdBy: true,
  updatedBy: true,
});

// Update data schema (makes all fields optional except updatedBy)
export const gameSystemUpdateSchema = gameSystemSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types generated from the schemas
export type IGameSystem = z.infer<typeof gameSystemSchema> & ApiFields;
export type IGameSystemCreateData = z.infer<typeof gameSystemCreateSchema>;
export type IGameSystemUpdateData = z.infer<typeof gameSystemUpdateSchema>;

// Export registration interface
export interface IGameSystemRegistration {
  actorTypes: Array<{
    name: string;
    description?: string;
    dataSchema: z.ZodType;
    uiComponent?: string;
  }>;
  itemTypes: Array<{
    name: string;
    description?: string;
    dataSchema: z.ZodType;
    uiComponent?: string;
  }>;
}

// Export inferred types
export type GameSystemActorType = z.infer<typeof gameSystemActorTypeSchema>;
export type GameSystemItemType = z.infer<typeof gameSystemItemTypeSchema>; 