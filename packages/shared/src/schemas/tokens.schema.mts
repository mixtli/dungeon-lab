import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';

// Grid bounds schema for token positioning
export const gridBoundsSchema = z.object({
  topLeft: z.object({
    x: z.number().int(),
    y: z.number().int()
  }),
  bottomRight: z.object({
    x: z.number().int(),
    y: z.number().int()
  }),
  elevation: z.number()
});

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
  encounterId: z.string(),
  bounds: gridBoundsSchema,
  documentId: z.string().optional(),
  documentType: z.string().optional(),
  ownerId: z.string().optional(), // Owner of the token (usually the player or GM)
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