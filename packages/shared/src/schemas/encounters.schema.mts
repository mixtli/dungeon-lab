import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { positionSchema } from './position.schema.mjs';
import { tokenSchema } from './tokens.schema.mjs';
import { mapSchemaWithVirtuals } from './map.schema.mjs';

// ============================================================================
// POSITION AND MOVEMENT SCHEMAS
// ============================================================================





// ============================================================================
// ENCOUNTER SCHEMAS
// ============================================================================


export const encounterSettingsSchema = z.object({
  showHiddenTokensToPlayers: z.boolean().default(false),
  gridSize: z.number().positive().default(5), // feet per square
  gridType: z.enum(['square', 'hex']).default('square'),
  enableFogOfWar: z.boolean().default(false),
  enableDynamicLighting: z.boolean().default(false)
});

export const encounterSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaignId: z.string(),
  mapId: z.string(),
  ownerId: z.string().optional(), // Owner of the encounter (usually the game master)
  currentMap: mapSchemaWithVirtuals.nullable().optional(),
  tokens: z.record(z.string(), tokenSchema).default({}),
  settings: encounterSettingsSchema.optional(),
  participants: z.array(z.string()).default([])
});

export const createEncounterSchema = encounterSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  tokens: true
});

export const updateEncounterSchema = encounterSchema
  .omit({
    id: true,
    createdBy: true,
    campaignId: true,
    tokens: true
  })
  .partial()
  .extend({
    updatedBy: z.string()
  });

// ============================================================================
// EVENT SCHEMAS
// ============================================================================

export const encounterEventSchema = z.object({
  id: z.string(),
  encounterId: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
  userId: z.string(),
  timestamp: z.string().default(() => new Date().toISOString())
});

// ============================================================================
// PERMISSION SCHEMAS
// ============================================================================

export const encounterPermissionsSchema = z.object({
  canView: z.boolean(),
  canControl: z.boolean(),
  canModify: z.boolean(),
  canDelete: z.boolean()
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const validationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional()
});

export const actionValidationSchema = validationResultSchema.extend({
  canPerform: z.boolean(),
  requirements: z.array(z.string()).optional()
});

export const movementValidationSchema = validationResultSchema.extend({
  canMove: z.boolean(),
  actualPath: z.array(positionSchema).optional(),
  blockedBy: z.array(z.string()).optional()
}); 