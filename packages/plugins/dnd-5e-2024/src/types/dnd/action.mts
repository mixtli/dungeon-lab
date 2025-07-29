import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { 
  actionTypeSchema,
  aoeShapeSchema,
  abilitySchema,
  restTypeSchema
} from './common.mjs';

/**
 * D&D 5e 2024 Action Runtime Types
 * 
 * Updated for 2024 action economy and enhanced action categorization.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Timing information schema (preserves 5etools structure)
 */
export const actionTimeSchema = z.object({
  number: z.number(),
  unit: z.enum(['action', 'bonus', 'reaction', 'minute', 'hour', 'round']),
  condition: z.string().optional()
});

/**
 * D&D Action runtime data schema
 * This is the canonical structure for actions in MongoDB
 */
export const dndActionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** Action type in 2024 economy */
  actionType: actionTypeSchema,
  
  /** Specific timing for reactions */
  trigger: z.string().optional(), // e.g., "when you take damage"
  
  /** Original timing data from 5etools (preserves structured information) */
  time: z.array(z.union([actionTimeSchema, z.string()])).optional(),
  
  /** Action requirements */
  requirements: z.object({
    /** Minimum level */
    level: z.number().optional(),
    /** Required class features */
    features: z.array(z.string()).optional(),
    /** Required equipment */
    equipment: z.array(z.string()).optional()
  }).optional(),
  
  /** Mechanical effects */
  effects: z.object({
    /** Range of effect */
    range: z.string().optional(), // e.g., "5 feet", "30 feet"
    
    /** Area of effect */
    area: z.object({
      type: aoeShapeSchema,
      size: z.number()
    }).optional(),
    
    /** Attack roll required */
    attackRoll: z.boolean().default(false),
    
    /** Saving throw required */
    savingThrow: z.object({
      ability: abilitySchema,
      dc: z.number().optional() // May be calculated
    }).optional(),
    
    /** Damage dealt */
    damage: z.object({
      dice: z.string(),
      type: z.string()
    }).optional()
  }).optional(),
  
  /** Usage limitations */
  uses: z.object({
    value: z.number(),
    per: restTypeSchema
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Action document schema (runtime)
 * Extends base VTT document with action-specific plugin data
 */
export const dndActionDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('action'),
  pluginData: dndActionDataSchema
});

/**
 * Runtime type exports
 */
export type DndActionData = z.infer<typeof dndActionDataSchema>;
export type DndActionDocument = z.infer<typeof dndActionDocumentSchema>;

/**
 * Basic D&D actions available to all characters
 */
export const basicActionIdentifiers = [
  'attack', 'cast-spell', 'dash', 'disengage', 'dodge', 'help',
  'hide', 'ready', 'search', 'use-object', 'grapple', 'shove'
] as const;

export type BasicActionIdentifier = (typeof basicActionIdentifiers)[number];

