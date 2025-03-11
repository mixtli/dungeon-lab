import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Token sizes following D&D 5e conventions
export const TokenSizeEnum = z.enum([
  'tiny',     // 2.5 x 2.5 feet
  'small',    // 5 x 5 feet
  'medium',   // 5 x 5 feet
  'large',    // 10 x 10 feet
  'huge',     // 15 x 15 feet
  'gargantuan' // 20 x 20 feet or larger
]);

// Base Token schema
export const tokenSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().url(),
  size: TokenSizeEnum,
  encounterId: zId('Encounter'),
  x: z.number().int(), // Grid position X
  y: z.number().int(), // Grid position Y
  actorId: zId('Actor').optional(),
  itemId: zId('Item').optional(),
  notes: z.string().optional(),
  isVisible: z.boolean().default(true),
  elevation: z.number().default(0), // Height above ground in feet
  createdBy: zId('User'),
  updatedBy: zId('User')
});

// Create data schema (omits auto-generated fields)
export const tokenCreateSchema = tokenSchema.omit({
  createdBy: true,
  updatedBy: true
});

// Update data schema (makes all fields optional except updatedBy)
export const tokenUpdateSchema = tokenSchema
  .omit({
    createdBy: true
  })
  .partial()
  .extend({
    updatedBy: zId('User')
  });

// Export types generated from the schemas
export type IToken = z.infer<typeof tokenSchema> & ApiFields;
export type ITokenCreateData = z.infer<typeof tokenCreateSchema>;
export type ITokenUpdateData = z.infer<typeof tokenUpdateSchema>;
export type TokenSize = z.infer<typeof TokenSizeEnum>; 