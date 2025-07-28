import { z } from 'zod';

/**
 * D&D 5e Condition Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
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
  effects: z.array(z.string()).optional(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  mechanics: z.object({
    /** Whether this condition affects sight */
    affectsSight: z.boolean().optional(),
    /** Whether this condition affects movement */
    affectsMovement: z.boolean().optional(),
    /** Whether this condition affects actions */
    affectsActions: z.boolean().optional(),
    /** Whether this condition provides advantage/disadvantage */
    advantageDisadvantage: z.object({
      attackRolls: z.enum(['advantage', 'disadvantage']).optional(),
      abilityChecks: z.enum(['advantage', 'disadvantage']).optional(),
      savingThrows: z.enum(['advantage', 'disadvantage']).optional(),
      attacksAgainst: z.enum(['advantage', 'disadvantage']).optional()
    }).optional(),
    /** Whether this condition prevents actions */
    preventsActions: z.boolean().optional(),
    /** Whether this condition prevents reactions */
    preventsReactions: z.boolean().optional(),
    /** Whether this condition prevents speech */
    preventsSpeech: z.boolean().optional()
  }).optional(),
  
  /** Severity level for conditions with degrees */
  severity: z.enum(['minor', 'moderate', 'severe']).optional(),
  
  /** Related conditions that might be applied together */
  relatedConditions: z.array(z.string()).optional()
});

/**
 * D&D Condition document schema (runtime)
 */
// Note: Condition documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndConditionDocumentSchema = dndConditionDataSchema;

/**
 * Runtime type exports
 */
export type DndConditionData = z.infer<typeof dndConditionDataSchema>;
export type DndConditionDocument = z.infer<typeof dndConditionDocumentSchema>;

/**
 * Standard D&D 5e condition identifiers
 */
export const conditionIdentifiers = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
  'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
  'stunned', 'unconscious', 'exhaustion'
] as const;

export type ConditionIdentifier = typeof conditionIdentifiers[number];