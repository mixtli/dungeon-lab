import { z } from 'zod';

/**
 * D&D 5e Deity Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Deity runtime data schema
 * This is the canonical structure for deities in MongoDB
 */
export const dndDeityDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  pantheon: z.string().optional(),
  alignment: z.array(z.enum([
    'LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE', 'U'
  ])).optional(),
  category: z.string().optional(),
  domains: z.array(z.enum([
    'Arcana', 'Death', 'Forge', 'Grave', 'Knowledge', 'Life', 'Light',
    'Nature', 'Order', 'Peace', 'Tempest', 'Trickery', 'Twilight', 'War'
  ])).optional(),
  province: z.string().optional(),
  symbol: z.string().optional(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Lore and religious information */
  religiousInfo: z.object({
    /** Holy symbol description */
    holySymbol: z.string().optional(),
    /** Primary worship locations */
    temples: z.array(z.string()).optional(),
    /** Major holy days */
    holyDays: z.array(z.string()).optional(),
    /** Typical worshippers */
    worshippers: z.array(z.string()).optional(),
    /** Clerical vestments description */
    vestments: z.string().optional(),
    /** Favored weapon */
    favoredWeapon: z.string().optional()
  }).optional(),
  
  /** Divine relationships */
  relationships: z.object({
    /** Allied deities */
    allies: z.array(z.string()).optional(),
    /** Enemy deities */
    enemies: z.array(z.string()).optional(),
    /** Served by (lesser deities, servants) */
    servants: z.array(z.string()).optional(),
    /** Superior deity (if applicable) */
    superior: z.string().optional()
  }).optional(),
  
  /** Divine rank */
  rank: z.enum(['greater', 'intermediate', 'lesser', 'demigod', 'quasi']).optional(),
  
  /** Associated creatures */
  associatedCreatures: z.array(z.string()).optional(),
  
  /** Divine realm location */
  divineRealm: z.string().optional()
});

/**
 * D&D Deity document schema (runtime)
 */
// Note: Deity documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndDeityDocumentSchema = dndDeityDataSchema;

/**
 * Runtime type exports
 */
export type DndDeityData = z.infer<typeof dndDeityDataSchema>;
export type DndDeityDocument = z.infer<typeof dndDeityDocumentSchema>;

/**
 * Major D&D pantheon identifiers
 */
export const pantheonIdentifiers = [
  'forgotten-realms', 'greyhawk', 'dragonlance', 'eberron', 'theros', 
  'ravnica', 'strixhaven', 'celtic', 'greek', 'egyptian', 'norse'
] as const;

export type PantheonIdentifier = typeof pantheonIdentifiers[number];