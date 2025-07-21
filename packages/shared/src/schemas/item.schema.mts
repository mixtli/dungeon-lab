import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';

// Base Item schema
export const itemSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  imageId: z.string().optional(),
  
  // Compendium reference (optional - only set for compendium content)
  compendiumId: z.string().optional(),
  
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  pluginId: z.string().min(1),
  weight: z.number().optional(),
  cost: z.number().optional(),
  data: z.any()
});

export const itemCreateSchema = itemSchema
  .extend({
    image: z.instanceof(File).optional()
  })
  .omit({
    id: true
  });
