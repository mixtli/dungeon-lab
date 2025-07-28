import { z } from 'zod';

/**
 * D&D 5e Sense Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Sense runtime data schema
 * This is the canonical structure for senses in MongoDB
 */
export const dndSenseDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Sense mechanics */
  mechanics: z.object({
    /** Default range in feet (if applicable) */
    defaultRange: z.number().optional(),
    /** Whether this sense works in darkness */
    worksInDarkness: z.boolean().optional(),
    /** Whether this sense detects invisible creatures */
    detectsInvisible: z.boolean().optional(),
    /** Whether this sense requires line of sight */
    requiresLineOfSight: z.boolean().optional(),
    /** Whether this sense can be blocked */
    canBeBlocked: z.boolean().optional(),
    /** What can block this sense */
    blockedBy: z.array(z.string()).optional(),
    /** What this sense can detect */
    detects: z.array(z.enum([
      'creatures', 'objects', 'magic', 'undead', 'emotions', 'thoughts',
      'life_force', 'movement', 'vibrations', 'heat', 'fear'
    ])).optional()
  }).optional(),
  
  /** Limitations */
  limitations: z.object({
    /** Conditions that disable this sense */
    disabledBy: z.array(z.string()).optional(),
    /** Environmental factors that reduce effectiveness */
    reducedBy: z.array(z.string()).optional(),
    /** What this sense cannot detect */
    cannotDetect: z.array(z.string()).optional()
  }).optional(),
  
  /** Creatures that typically have this sense */
  typicalCreatures: z.array(z.string()).optional(),
  
  /** How creatures acquire this sense */
  acquisition: z.object({
    /** Can be gained naturally by certain species */
    naturalSpecies: z.array(z.string()).optional(),
    /** Can be gained through magic */
    magicalMeans: z.boolean().optional(),
    /** Can be gained through items */
    magicalItems: z.boolean().optional(),
    /** Spells that grant this sense */
    spells: z.array(z.string()).optional()
  }).optional(),
  
  /** Variants of this sense */
  variants: z.array(z.object({
    name: z.string(),
    description: z.string(),
    differences: z.string()
  })).optional(),
  
  /** Game impact */
  gameImpact: z.object({
    /** How this affects stealth attempts */
    stealthInteraction: z.string().optional(),
    /** How this affects combat */
    combatAdvantages: z.array(z.string()).optional(),
    /** How this affects exploration */
    explorationBenefits: z.array(z.string()).optional()
  }).optional(),
  
  /** Related senses */aaaa
  relatedSenses: z.array(z.string()).optional()
});

/**
 * D&D Sense document schema (runtime)
 */
// Note: Sense documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndSenseDocumentSchema = dndSenseDataSchema;

/**
 * Runtime type exports
 */
export type DndSenseData = z.infer<typeof dndSenseDataSchema>;
export type DndSenseDocument = z.infer<typeof dndSenseDocumentSchema>;

/**
 * Standard D&D 5e sense identifiers
 */
export const senseIdentifiers = [
  'darkvision', 'blindsight', 'truesight', 'tremorsense', 'telepathy', 
  'detect-evil-and-good', 'detect-magic', 'detect-thoughts', 'scent'
] as const;

export type SenseIdentifier = typeof senseIdentifiers[number];