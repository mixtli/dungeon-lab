import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { gridPositionSchema } from './position.schema.mjs';

// ============================================================================
// TOKEN SCHEMAS
// ============================================================================

export const TokenSizeEnum = z.enum([
  'tiny',
  'small', 
  'medium',
  'large',
  'huge',
  'gargantuan'
]);

export const tokenConditionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  duration: z.number().int().min(-1).optional(), // -1 for permanent
  source: z.string().optional()
});

export const tokenStatsSchema = z.object({
  hitPoints: z.number().int().min(0),
  maxHitPoints: z.number().int().min(1),
  armorClass: z.number().int().min(0),
  speed: z.number().int().min(0),
  temporaryHitPoints: z.number().int().min(0).optional()
});

export const tokenSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  imageUrl: z.string().url(),
  size: TokenSizeEnum,
  encounterId: z.string(),
  position: gridPositionSchema,
  actorId: z.string().optional(),
  itemId: z.string().optional(),
  notes: z.string().optional(),
  isVisible: z.boolean().default(true),
  isPlayerControlled: z.boolean().default(false),
  stats: tokenStatsSchema.optional(),
  conditions: z.array(tokenConditionSchema).default([]),
  version: z.number().int().min(1).default(1)
});

export const createTokenSchema = tokenSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export const updateTokenSchema = tokenSchema
  .omit({
    id: true,
    createdBy: true,
    encounterId: true
  })
  .partial()
  .extend({
    updatedBy: z.string()
  }); 