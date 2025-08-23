import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { rollModifierSchema, durationTypeSchema } from './common.mjs';

/**
 * D&D 5e 2024 Condition Runtime Types
 * 
 * Updated for 2024 condition list and enhanced mechanical descriptions.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Condition runtime data schema
 * This is the canonical structure for conditions in MongoDB
 */
export const dndConditionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** Mechanical effects of the condition */
  effects: z.object({
    /** Movement restrictions */
    movement: z.object({
      prevented: z.boolean().default(false),
      reduced: z.boolean().default(false),
      speedReduction: z.number().optional()
    }).optional(),
    
    /** Action restrictions */
    actions: z.object({
      prevented: z.boolean().default(false),
      disadvantage: z.boolean().default(false)
    }).optional(),
    
    /** Attack roll modifications */
    attackRolls: z.object({
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional(),
      prevented: z.boolean().default(false)
    }).optional(),
    
    /** Saving throw modifications */
    savingThrows: z.object({
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional(),
      specific: z.record(z.string(), rollModifierSchema).optional(),
      autoFail: z.array(z.string()).optional(), // ["strength", "dexterity"] for paralyzed
      autoSucceed: z.array(z.string()).optional()
    }).optional(),
    
    /** How others interact with affected creature */
    againstAffected: z.object({
      attackAdvantage: z.boolean().optional(),
      attackDisadvantage: z.boolean().optional(),
      criticalHitWithin: z.number().optional() // 5 feet for paralyzed
    }).optional(),
    
    /** Ability check effects */
    abilityChecks: z.object({
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional(),
      autoFail: z.array(z.string()).optional(), // ["sight-based", "hearing-based"]
      specific: z.record(z.string(), rollModifierSchema).optional()
    }).optional(),
    
    /** Initiative effects */
    initiative: z.object({
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional()
    }).optional(),
    
    /** Visibility and concealment effects */
    visibility: z.object({
      invisible: z.boolean().optional(),
      concealed: z.boolean().optional(),
      equipmentConcealed: z.boolean().optional()
    }).optional(),
    
    /** Distance-dependent effects (e.g., prone attack rules) */
    distanceDependent: z.object({
      enabled: z.boolean().default(false),
      within5Feet: z.object({
        attacksAgainstAdvantage: z.boolean().optional(),
        attacksAdvantage: z.boolean().optional(),
        attacksAgainstDisadvantage: z.boolean().optional(),
        attacksDisadvantage: z.boolean().optional()
      }).optional(),
      beyond5Feet: z.object({
        attacksAgainstAdvantage: z.boolean().optional(),
        attacksAdvantage: z.boolean().optional(),
        attacksAgainstDisadvantage: z.boolean().optional(),
        attacksDisadvantage: z.boolean().optional()
      }).optional()
    }).optional(),
    
    /** Source-dependent effects (charmed, frightened) */
    sourceDependent: z.object({
      enabled: z.boolean().default(false),
      cannotAttackSource: z.boolean().optional(),
      cannotTargetSource: z.boolean().optional(),
      cannotApproachSource: z.boolean().optional(),
      lineOfSightRequired: z.boolean().optional()
    }).optional(),
    
    /** Stacking system for conditions like exhaustion */
    stacking: z.object({
      stackable: z.boolean().default(false),
      maxStacks: z.number().optional(),
      rollPenalty: z.number().optional(), // per stack level
      speedReduction: z.number().optional(), // per stack level  
      deathAtMax: z.boolean().optional()
    }).optional(),
    
    /** Recovery and removal rules */
    recovery: z.object({
      removedOnLongRest: z.boolean().optional(),
      removedOnShortRest: z.boolean().optional(),
      removedOnTurnEnd: z.boolean().optional(),
      removedOnTurnStart: z.boolean().optional(),
      selfRemovalAction: z.string().optional() // "half-speed-movement" for prone
    }).optional()
  }),
  
  /** Duration information */
  duration: z.object({
    type: durationTypeSchema,
    specific: z.string().optional() // e.g., "1 minute", "24 hours"
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Condition document schema (runtime)
 * Extends base VTT document with condition-specific plugin data
 */
export const dndConditionDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('condition'),
  pluginData: dndConditionDataSchema
});

/**
 * Runtime type exports
 */
export type DndConditionData = z.infer<typeof dndConditionDataSchema>;
export type DndConditionDocument = z.infer<typeof dndConditionDocumentSchema>;

/**
 * D&D 2024 Conditions (verified against SRD)
 */
export const conditionIdentifiers = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious'
] as const;

export type ConditionIdentifier = typeof conditionIdentifiers[number];

/**
 * Condition instance schema for character.state.conditions
 * Represents an active condition on a character with metadata
 */
export const conditionInstanceSchema = z.object({
  /** MongoDB ObjectId of the condition document */
  conditionId: z.string().min(1),
  
  /** Level/stack count for stackable conditions (exhaustion) */
  level: z.number().min(1).default(1),
  
  /** What applied this condition (spell name, monster ability, etc.) */
  source: z.string().optional(),
  
  /** When this condition was applied (timestamp) */
  addedAt: z.number(),
  
  /** Source-specific metadata (duration, DC, etc.) */
  metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * Runtime type for condition instances
 */
export type ConditionInstance = z.infer<typeof conditionInstanceSchema>;

