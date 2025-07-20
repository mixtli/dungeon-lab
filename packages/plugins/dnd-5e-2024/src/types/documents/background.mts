import { z } from 'zod';
import { sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * D&D 5e Background data schema
 * Based on Foundry VTT background structure
 */
export const backgroundDataSchema = z.object({
  // Basic background info
  identifier: z.string(), // unique background identifier like 'acolyte'
  description: descriptionSchema,
  source: sourceSchema,
  
  // Character advancement from background
  advancement: z.array(z.record(z.unknown())).default([]), // Complex advancement system
  
  // Starting equipment
  startingEquipment: z.array(z.record(z.unknown())).default([]),
  
  // Wealth/starting money
  wealth: z.string().default(''),
  
  // Background features (special abilities, connections, etc.)
  features: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(['feature', 'specialty', 'contact', 'benefit']).default('feature')
  })).default([]),
  
  // Suggested characteristics
  characteristics: z.object({
    personalityTraits: z.array(z.string()).default([]),
    ideals: z.array(z.string()).default([]),
    bonds: z.array(z.string()).default([]),
    flaws: z.array(z.string()).default([])
  }).optional()
});

/**
 * Background identifiers from D&D 5e 2024
 */
export const backgroundIdentifiers = [
  'acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'folk-hero',
  'hermit', 'noble', 'outlander', 'sage', 'sailor', 'soldier'
] as const;

/**
 * Background feature types
 */
export const featureTypes = ['feature', 'specialty', 'contact', 'benefit'] as const;

/**
 * Common background skills by background
 */
export const backgroundSkills = {
  acolyte: ['insight', 'religion'],
  artisan: ['investigation', 'persuasion'],
  charlatan: ['deception', 'sleight-of-hand'],
  criminal: ['deception', 'stealth'],
  entertainer: ['acrobatics', 'performance'],
  'folk-hero': ['animal-handling', 'survival'],
  hermit: ['herbalism', 'religion'],
  noble: ['history', 'persuasion'],
  outlander: ['athletics', 'survival'],
  sage: ['arcana', 'history'],
  sailor: ['athletics', 'perception'],
  soldier: ['athletics', 'intimidation']
} as const;

export type BackgroundData = z.infer<typeof backgroundDataSchema>;
export type BackgroundIdentifier = typeof backgroundIdentifiers[number];
export type FeatureType = typeof featureTypes[number];