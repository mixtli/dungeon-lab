import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { tokenSchema } from './tokens.schema.mjs';
import { positionSchema } from './position.schema.mjs';

// ============================================================================
// POSITION AND MOVEMENT SCHEMAS
// ============================================================================


// ============================================================================
// INITIATIVE SCHEMAS
// ============================================================================

export const initiativeEntrySchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  actorId: z.string().optional(),
  name: z.string().min(1),
  initiative: z.number(),
  hasActed: z.boolean().default(false),
  isDelayed: z.boolean().default(false),
  isHolding: z.boolean().default(false),
  modifiers: z.record(z.string(), z.number()).default({})
});

export const initiativeTrackerSchema = z.object({
  entries: z.array(initiativeEntrySchema).default([]),
  currentTurn: z.number().int().min(0).default(0),
  currentRound: z.number().int().min(1).default(1),
  isActive: z.boolean().default(false)
});

// ============================================================================
// COMBAT ACTION SCHEMAS
// ============================================================================

export const ActionTypeEnum = z.enum([
  'attack',
  'spell',
  'move',
  'dash',
  'dodge',
  'help',
  'hide',
  'ready',
  'search',
  'custom'
]);

export const ActionCategoryEnum = z.enum([
  'action',
  'bonus_action',
  'reaction',
  'free',
  'legendary'
]);

export const actionTargetSchema = z.object({
  type: z.enum(['token', 'position', 'area']),
  tokenId: z.string().optional(),
  position: positionSchema.optional(),
  area: z.object({
    center: positionSchema,
    shape: z.enum(['circle', 'square', 'cone', 'line']),
    size: z.number().positive()
  }).optional()
});

export const combatActionSchema = z.object({
  id: z.string(),
  type: ActionTypeEnum,
  name: z.string().min(1),
  description: z.string().optional(),
  category: ActionCategoryEnum,
  range: z.number().min(0).optional(),
  targets: z.array(actionTargetSchema),
  data: z.record(z.string(), z.unknown()).optional(),
  actorId: z.string(),
  tokenId: z.string(),
  encounterId: z.string()
});

export const actionResultSchema = z.object({
  success: z.boolean(),
  description: z.string(),
  effects: z.array(z.string()), // effect IDs
  damage: z.array(z.object({
    amount: z.number().min(0),
    type: z.string(),
    target: z.string()
  })).optional(),
  healing: z.array(z.object({
    amount: z.number().min(0),
    target: z.string()
  })).optional()
});

// ============================================================================
// EFFECT SCHEMAS
// ============================================================================

export const EffectTypeEnum = z.enum([
  'damage',
  'healing',
  'condition',
  'stat_modifier',
  'movement_modifier',
  'custom'
]);

export const effectSchema = z.object({
  id: z.string(),
  type: EffectTypeEnum,
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().int().min(-1), // -1 for permanent
  source: z.string(),
  targetId: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  stackable: z.boolean().default(false),
  createdAt: z.date().default(() => new Date())
});

export const effectApplicationSchema = z.object({
  effectId: z.string(),
  targetId: z.string(),
  applied: z.boolean(),
  message: z.string().optional(),
  changes: z.record(z.string(), z.unknown()).optional()
});

// ============================================================================
// ENCOUNTER SCHEMAS
// ============================================================================

export const EncounterStatusEnum = z.enum([
  'draft',
  'ready', 
  'in_progress',
  'paused',
  'completed'
]);

export const encounterSettingsSchema = z.object({
  autoRollInitiative: z.boolean().default(false),
  allowPlayerInitiativeEdit: z.boolean().default(true),
  showHiddenTokensToPlayers: z.boolean().default(false),
  enableTurnTimer: z.boolean().default(false),
  turnTimerDuration: z.number().int().min(10).max(600).default(60), // 10 seconds to 10 minutes
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
  status: EncounterStatusEnum.default('draft'),
  tokens: z.array(tokenSchema).default([]),
  initiative: initiativeTrackerSchema.default({}),
  effects: z.array(effectSchema).default([]),
  settings: encounterSettingsSchema.default({}),
  participants: z.array(z.string()).default([]),
  version: z.number().int().min(1).default(1)
});

export const createEncounterSchema = encounterSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  tokens: true,
  initiative: true,
  effects: true,
  version: true
});

export const updateEncounterSchema = encounterSchema
  .omit({
    id: true,
    createdBy: true,
    campaignId: true,
    tokens: true,
    initiative: true,
    effects: true
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
  timestamp: z.date().default(() => new Date())
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