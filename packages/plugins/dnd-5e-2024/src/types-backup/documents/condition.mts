import { z } from 'zod';
import { sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * D&D 5e Condition/Status Effect data schema
 * Based on Foundry VTT base items that represent conditions
 */
export const conditionDataSchema = z.object({
  // Basic condition info
  identifier: z.string().optional(),
  description: descriptionSchema.optional(),
  source: sourceSchema.optional(),
  
  // Condition effects (empty for base items, may be used in other contexts)
  effects: z.array(z.record(z.unknown())).default([]),
  
  // Allow any additional properties since base items have minimal data
  // and conditions might have various effects in different contexts
}).catchall(z.unknown());

/**
 * Common D&D 5e conditions
 */
export const standardConditions = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
] as const;

export type ConditionData = z.infer<typeof conditionDataSchema>;
export type StandardCondition = typeof standardConditions[number];