import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { gridPositionSchema } from './position.schema.mjs';

// Define the TokenSize enum for zod
export const TokenSizeEnum = z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);

// ============================================================================
// TOKEN SCHEMAS
// ============================================================================

// Token condition schema
export const tokenConditionSchema = z.object({
  name: z.string(),
  duration: z.number().optional(),
  source: z.string().optional()
});

// Base token schema with required fields
const baseTokenSchema = z.object({
  name: z.string().min(1).max(255),
  imageUrl: z.string().url(),
  size: TokenSizeEnum,
  encounterId: z.string(),
  position: gridPositionSchema,
  actorId: z.string().optional(),
  itemId: z.string().optional(),
  notes: z.string().optional(),
  isVisible: z.boolean(),
  isPlayerControlled: z.boolean(),
  data: z.record(z.string(), z.any()).optional(), // Match actor schema's data field type
  conditions: z.array(tokenConditionSchema)
});

// Full token schema with base fields and version
export const tokenSchema = baseSchema.extend({
  ...baseTokenSchema.shape,
  version: z.number().int().min(1)
});

// Create token schema (omits base schema fields and sets defaults)
export const createTokenSchema = baseTokenSchema.extend({
  isVisible: z.boolean().default(true),
  isPlayerControlled: z.boolean().default(false),
  data: z.record(z.string(), z.any()).default({}), // Match actor schema's data field type
  conditions: z.array(tokenConditionSchema).default([])
});

// Update token schema (all fields optional except updatedBy)
export const updateTokenSchema = tokenSchema
  .omit({
    id: true,
    createdBy: true,
    encounterId: true,
    version: true // Explicitly omit version from update schema
  })
  .partial()
  .extend({
    updatedBy: z.string()
  }); 