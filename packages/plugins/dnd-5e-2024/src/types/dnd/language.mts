import { z } from 'zod';

/**
 * D&D 5e Language Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Language runtime data schema
 * This is the canonical structure for languages in MongoDB
 */
export const dndLanguageDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['standard', 'exotic', 'secret', 'ancient', 'regional']).optional(),
  script: z.string().optional(),
  typicalSpeakers: z.array(z.string()).optional(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Language characteristics */
  characteristics: z.object({
    /** Whether this language has a written form */
    hasWrittenForm: z.boolean().optional(),
    /** Difficulty to learn (relative to Common) */
    difficulty: z.enum(['trivial', 'easy', 'moderate', 'hard', 'extreme']).optional(),
    /** Whether this is a living language or dead/ancient */
    status: z.enum(['living', 'dead', 'ancient', 'secret']).optional(),
    /** Primary regions where spoken */
    regions: z.array(z.string()).optional()
  }).optional(),
  
  /** Script information */
  scriptInfo: z.object({
    /** Name of the script used */
    scriptName: z.string().optional(),
    /** Description of the writing system */
    description: z.string().optional(),
    /** Other languages that use the same script */
    sharedWith: z.array(z.string()).optional()
  }).optional(),
  
  /** Cultural context */
  cultural: z.object({
    /** Primary cultures that speak this language */
    cultures: z.array(z.string()).optional(),
    /** Historical significance */
    history: z.string().optional(),
    /** Religious or ceremonial usage */
    ceremonialUse: z.boolean().optional()
  }).optional(),
  
  /** Game mechanics */
  mechanics: z.object({
    /** Whether knowing this language provides special benefits */
    providesSecretKnowledge: z.boolean().optional(),
    /** Whether this language can be learned normally */
    canBelearned: z.boolean().optional(),
    /** Special requirements to learn */
    learningRequirements: z.string().optional()
  }).optional(),
  
  /** Related languages */
  relatedLanguages: z.array(z.object({
    name: z.string(),
    relationship: z.enum(['dialect', 'ancestor', 'descendant', 'sibling', 'trade_form'])
  })).optional(),
  
  /** Common phrases or words */
  commonPhrases: z.array(z.object({
    phrase: z.string(),
    meaning: z.string(),
    usage: z.string().optional()
  })).optional()
});

/**
 * D&D Language document schema (runtime)
 */
// Note: Language documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndLanguageDocumentSchema = dndLanguageDataSchema;

/**
 * Runtime type exports
 */
export type DndLanguageData = z.infer<typeof dndLanguageDataSchema>;
export type DndLanguageDocument = z.infer<typeof dndLanguageDocumentSchema>;

/**
 * Standard D&D 5e language identifiers
 */
export const languageIdentifiers = [
  // Standard languages
  'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc',
  // Exotic languages
  'abyssal', 'celestial', 'draconic', 'deep-speech', 'infernal', 'primordial', 'sylvan', 'undercommon',
  // Secret languages
  'thieves-cant', 'druidic'
] as const;

export type LanguageIdentifier = typeof languageIdentifiers[number];