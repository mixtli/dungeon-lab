import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';

// Token sizes following D&D 5e conventions
export const TokenSizeEnum = z.enum([
  'tiny', // 2.5 x 2.5 feet
  'small', // 5 x 5 feet
  'medium', // 5 x 5 feet
  'large', // 10 x 10 feet
  'huge', // 15 x 15 feet
  'gargantuan' // 20 x 20 feet or larger
]);

// Base Token schema
export const tokenSchema = baseSchema.extend({
  name: z.string().min(1),
  imageUrl: z.string().url(),
  size: TokenSizeEnum,
  encounterId: z.string(),
  x: z.number().int(), // Grid position X
  y: z.number().int(), // Grid position Y
  actorId: z.string().optional(),
  itemId: z.string().optional(),
  notes: z.string().optional(),
  isVisible: z.boolean().default(true),
  elevation: z.number().default(0) // Height above ground in feet
});

// Create data schema (omits auto-generated fields)
export const tokenCreateSchema = tokenSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

// Update data schema (makes all fields optional except updatedBy)
export const tokenUpdateSchema = tokenSchema
  .omit({
    id: true,
    createdBy: true
  })
  .partial()
  .extend({
    updatedBy: z.string()
  });
