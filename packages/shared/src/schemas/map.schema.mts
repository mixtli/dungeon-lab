import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';

// Base Map schema
export const mapSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().optional(),

  // Direct asset references using string IDs (will be ObjectId in server models via zId)
  thumbnailId: z.string().optional(),
  imageId: z.string().optional(),

  gridColumns: z.coerce.number().int().positive(),
  gridRows: z.coerce.number().int().positive(),
  aspectRatio: z.coerce.number().positive()
});

// Schema for map creation that includes an optional image field for validation
export const mapCreateSchema = mapSchema
  .omit({
    id: true,
    gridRows: true,
    aspectRatio: true
  })
  .extend({
    // Add an optional field for the image during creation (can be file upload or AI generated)
    image: z.any().optional()
  });
