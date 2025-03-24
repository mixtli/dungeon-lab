import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Base Item schema
export const itemSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  image: z.string().url().optional(),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  pluginId: z.string().min(1),
  weight: z.number().optional(),
  cost: z.number().optional(),
  data: z.any(),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const itemCreateSchema = itemSchema.omit({
  createdBy: true,
  updatedBy: true,
});

// Update data schema (makes all fields optional except updatedBy)
export const itemUpdateSchema = itemSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types generated from the schemas
export type IItem = z.infer<typeof itemSchema> & ApiFields;
export type IItemCreateData = z.infer<typeof itemCreateSchema>;
export type IItemUpdateData = z.infer<typeof itemUpdateSchema>; 