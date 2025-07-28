import { z } from 'zod';

/**
 * D&D 5e Action Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Action runtime data schema
 * This is the canonical structure for actions in MongoDB
 */
export const dndActionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  actionType: z.enum(['action', 'bonus_action', 'reaction', 'free', 'movement']).optional(),
  timeCost: z.object({
    number: z.number(),
    unit: z.enum(['action', 'bonus_action', 'reaction', 'minute', 'hour', 'round'])
  }).optional(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Conditions under which this action can be used */
  requirements: z.object({
    /** Minimum level required */
    level: z.number().optional(),
    /** Required class features */
    features: z.array(z.string()).optional(),
    /** Required equipment or items */
    equipment: z.array(z.string()).optional(),
    /** Other prerequisites */
    other: z.string().optional()
  }).optional(),
  
  /** Mechanical effects of the action */
  mechanics: z.object({
    /** Range of the action in feet */
    range: z.number().optional(),
    /** Area of effect */
    areaOfEffect: z.object({
      type: z.enum(['sphere', 'cube', 'cylinder', 'cone', 'line']),
      size: z.number()
    }).optional(),
    /** Saving throw required */
    savingThrow: z.object({
      ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
      dc: z.number().optional()
    }).optional(),
    /** Attack roll required */
    attackRoll: z.boolean().optional(),
    /** Damage dealt */
    damage: z.object({
      dice: z.string(),
      type: z.string()
    }).optional()
  }).optional(),
  
  /** Common variants or special uses */
  variants: z.array(z.object({
    name: z.string(),
    description: z.string(),
    requirements: z.string().optional()
  })).optional(),
  
  /** Related actions */
  relatedActions: z.array(z.string()).optional(),
  
  /** Tags for categorization */
  tags: z.array(z.enum([
    'combat', 'exploration', 'social', 'magic', 'movement', 
    'utility', 'defensive', 'offensive', 'healing'
  ])).optional()
});

/**
 * D&D Action document schema (runtime)
 */
// Note: Action documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndActionDocumentSchema = dndActionDataSchema;

/**
 * Runtime type exports
 */
export type DndActionData = z.infer<typeof dndActionDataSchema>;
export type DndActionDocument = z.infer<typeof dndActionDocumentSchema>;

/**
 * Action identifiers from D&D 5e
 */
export const actionIdentifiers = [
  'attack', 'cast-spell', 'dash', 'disengage', 'dodge', 'help', 'hide', 
  'ready', 'search', 'use-object', 'grapple', 'shove'
] as const;

export type ActionIdentifier = (typeof actionIdentifiers)[number];