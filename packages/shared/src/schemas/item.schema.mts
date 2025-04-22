import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';

// Base Item schema
export const itemSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  imageId: z.string().optional(),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  pluginId: z.string().min(1),
  weight: z.number().optional(),
  cost: z.number().optional(),
  data: z.any()
});

export const itemCreateSchema = itemSchema.extend({
  image: z.instanceof(File).optional()
});

// Create data schema (omits auto-generated fields)
// export const itemCreateSchema = itemSchema.omit({
//   id: true,
//   createdBy: true,
//   updatedBy: true,
// });

// // Update data schema (makes all fields optional except updatedBy)
// export const itemUpdateSchema = itemSchema
//   .omit({
//     id: true,
//     createdBy: true,
//   })
//   .partial()
//   .extend({
//     updatedBy: z.string(),
//   });

// Export types generated from the schemas
export type IItem = z.infer<typeof itemSchema>;
// export type IItemCreateData = z.infer<typeof itemCreateSchema>;
// export type IItemUpdateData = z.infer<typeof itemUpdateSchema>;
