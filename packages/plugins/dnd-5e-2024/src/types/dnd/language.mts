import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';

/**
 * D&D 5e 2024 Language Runtime Types
 * 
 * Updated for 2024 language system with standard/rare categories,
 * proper script information, and typical speakers.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Language runtime data schema
 * Updated for 2024 standard/rare language categories
 */
export const dndLanguageDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** 2024: Language category (standard vs rare) */
  category: z.enum(['standard', 'rare']),
  
  /** Typical speakers of this language */
  typicalSpeakers: z.array(z.string()),
  
  /** Script information */
  script: z.object({
    /** Name of the script (e.g., "Common", "Elvish", "Draconic") */
    name: z.string(),
    /** Alternative name for the script */
    alternateName: z.string().optional(),
    /** Description of the writing system */
    description: z.string().optional(),
    /** Other languages that share this script */
    sharedWith: z.array(z.string()).default([])
  }),
  
  /** 2024: Whether available during character creation */
  availableAtCreation: z.boolean().default(true),
  
  /** Special properties */
  properties: z.object({
    /** Whether this is a sign language */
    isSignLanguage: z.boolean().default(false),
    /** Whether this is a secret language */
    isSecret: z.boolean().default(false),
    /** Whether this language has dialects */
    hasDialects: z.boolean().default(false),
    /** Special learning requirements */
    learningRequirements: z.string().optional()
  }).optional(),
  
  /** Dialect information (for Primordial) */
  dialects: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    /** Can communicate with speakers of other dialects */
    mutuallyIntelligible: z.boolean().default(true)
  })).optional(),
  
  /** Cultural and regional information */
  cultural: z.object({
    /** Primary planes or regions where spoken */
    primaryRegions: z.array(z.string()).optional(),
    /** Historical significance */
    history: z.string().optional(),
    /** Religious or ceremonial importance */
    ceremonialUse: z.boolean().default(false)
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Language document schema (runtime)
 * Extends base VTT document with language-specific plugin data
 */
export const dndLanguageDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('language'),
  pluginData: dndLanguageDataSchema
});

/**
 * Runtime type exports
 */
export type DndLanguageData = z.infer<typeof dndLanguageDataSchema>;
export type DndLanguageDocument = z.infer<typeof dndLanguageDocumentSchema>;

/**
 * D&D 2024 Standard Languages (available at character creation)
 */
export const standardLanguageIdentifiers = [
  'common', 'common-sign-language', 'dwarvish', 'elvish', 'giant', 
  'gnomish', 'goblin', 'halfling', 'orc', 'draconic'
] as const;

/**
 * D&D 2024 Rare Languages (not available at character creation)
 */
export const rareLanguageIdentifiers = [
  'abyssal', 'celestial', 'deep-speech', 'druidic', 'infernal', 
  'primordial', 'sylvan', 'thieves-cant', 'undercommon'
] as const;

/**
 * All D&D 2024 Languages
 */
export const allLanguageIdentifiers = [
  ...standardLanguageIdentifiers,
  ...rareLanguageIdentifiers
] as const;

export type StandardLanguageIdentifier = typeof standardLanguageIdentifiers[number];
export type RareLanguageIdentifier = typeof rareLanguageIdentifiers[number];
export type LanguageIdentifier = typeof allLanguageIdentifiers[number];

/**
 * Primordial dialects (mutually intelligible)
 */
export const primordialDialects = [
  'aquan', 'auran', 'ignan', 'terran'
] as const;

export type PrimordialDialect = typeof primordialDialects[number];

/**
 * D&D 2024 Script names and their shared languages
 */
export const scriptMapping = {
  'Common': ['common', 'halfling'],
  'Dwarven': ['dwarvish', 'giant', 'gnomish', 'goblin', 'orc', 'primordial'],
  'Elvish': ['elvish', 'sylvan', 'undercommon'],
  'Draconic': ['draconic'],
  'Celestial': ['celestial'],
  'Infernal': ['infernal'],
  'Abyssal': ['abyssal'],
  'DeepSpeech': ['deep-speech']
} as const;

// Create/Update schemas for languages
export const createDndLanguageSchema = dndLanguageDataSchema.partial({
  availableAtCreation: true,
  properties: true
});

export const updateDndLanguageSchema = dndLanguageDataSchema.partial();

export type CreateDndLanguage = z.infer<typeof createDndLanguageSchema>;
export type UpdateDndLanguage = z.infer<typeof updateDndLanguageSchema>;