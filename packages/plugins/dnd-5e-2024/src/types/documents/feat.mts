import { z } from 'zod';
import { sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * D&D 5e Feat data schema
 * Based on Foundry VTT feat structure
 */
export const featDataSchema = z.object({
  // Basic feat info
  identifier: z.string(), // unique feat identifier
  description: descriptionSchema,
  source: sourceSchema,
  
  // Feat type and category
  type: z.object({
    value: z.enum(['feat', 'class', 'race', 'background', 'monster', 'epic']).default('feat'),
    subtype: z.string().default('')
  }),
  
  // Prerequisites
  prerequisites: z.object({
    level: z.number().min(1).optional(),
    abilities: z.record(z.number()).optional(), // e.g., { str: 13, dex: 15 }
    skills: z.array(z.string()).default([]),
    other: z.string().default('')
  }),
  
  // Requirements (text description)
  requirements: z.string().default(''),
  
  // Uses and limitations
  uses: z.object({
    spent: z.number().default(0),
    recovery: z.array(z.string()).default([]),
    max: z.string().default('')
  }),
  
  // Properties and tags
  properties: z.array(z.string()).default([]),
  
  // Activities (special abilities granted by the feat)
  activities: z.record(z.string(), z.record(z.unknown())).default({}),
  
  // Enchantments (mechanical effects)
  enchant: z.record(z.unknown()).default({}),
  
  // Character advancement from feat
  advancement: z.array(z.record(z.unknown())).default([])
});

/**
 * Feat categories
 */
export const featCategories = {
  'general': 'General Feats',
  'fighting-style': 'Fighting Style Feats', 
  'magic': 'Magic Feats',
  'origin': 'Origin Feats',
  'epic': 'Epic Boons'
} as const;

/**
 * Common feat types
 */
export const featTypes = ['feat', 'class', 'race', 'background', 'monster', 'epic'] as const;

/**
 * Feat properties/tags
 */
export const featProperties = [
  'half-feat', 'prerequisite', 'magic', 'combat', 'social', 'exploration'
] as const;

/**
 * Common prerequisites
 */
export const commonPrerequisites = {
  'ability-score-improvement': 'Must be 4th level or higher',
  'fighting-initiate': 'Proficiency with a martial weapon',
  'magic-initiate': 'None',
  'skilled': 'None',
  'tough': 'None'
} as const;

export type FeatData = z.infer<typeof featDataSchema>;
export type FeatCategory = keyof typeof featCategories;
export type FeatType = typeof featTypes[number];
export type FeatProperty = typeof featProperties[number];