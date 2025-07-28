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
      specific: z.record(z.string(), rollModifierSchema).optional()
    }).optional(),
    
    /** How others interact with affected creature */
    againstAffected: z.object({
      attackAdvantage: z.boolean().optional(),
      attackDisadvantage: z.boolean().optional()
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

