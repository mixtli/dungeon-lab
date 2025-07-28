import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { abilitySchema } from './common.mjs';

/**
 * D&D 5e 2024 Feat System Runtime Types
 * 
 * Complete restructure with 4 distinct feat categories.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Base feat schema shared by all feat types
 */
const baseFeatSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Origin Feats - granted by backgrounds at level 1
 * No prerequisites, no ability score improvements
 */
export const originFeatSchema = baseFeatSchema.extend({
  category: z.literal('origin'),
  /** Origin feats have no prerequisites */
  prerequisites: z.never().optional(),
  /** Origin feats don't grant ability score improvements */
  abilityScoreImprovement: z.never().optional(),
  /** Which background grants this feat */
  grantedBy: z.string()
});

/**
 * General Feats - available starting at level 4
 * All provide +1 to an ability score AND a special benefit
 */
export const generalFeatSchema = baseFeatSchema.extend({
  category: z.literal('general'),
  
  /** Prerequisites for taking this feat */
  prerequisites: z.object({
    level: z.number().min(4), // General feats require level 4+
    ability: z.record(abilitySchema, z.number()).optional(), // e.g., {"strength": 13}
    proficiency: z.array(z.string()).optional(),
    other: z.string().optional()
  }),
  
  /** 2024: ALL General Feats provide +1 to an ability score */
  abilityScoreImprovement: z.object({
    /** Which ability scores can be improved (player chooses) */
    choices: z.array(abilitySchema),
    /** Always +1 for General Feats */
    value: z.literal(1)
  }),
  
  /** Whether this feat can be taken multiple times */
  repeatable: z.boolean().default(false)
});

/**
 * Fighting Style Feats - granted by class features
 * Only available to classes with Fighting Style feature
 */
export const fightingStyleFeatSchema = baseFeatSchema.extend({
  category: z.literal('fighting_style'),
  /** Must have Fighting Style class feature */
  prerequisites: z.object({
    classFeature: z.literal('Fighting Style')
  })
});

/**
 * Epic Boon Feats - available at level 19+
 * Can increase ability scores above 20 (up to 30)
 */
export const epicBoonFeatSchema = baseFeatSchema.extend({
  category: z.literal('epic_boon'),
  prerequisites: z.object({
    level: z.literal(19) // Epic Boons require level 19+
  }),
  /** Epic Boons can increase ability scores to 30 */
  abilityScoreImprovement: z.object({
    choices: z.array(abilitySchema),
    value: z.number(),
    /** Can exceed normal 20 limit */
    canExceedTwenty: z.boolean().default(true)
  }).optional()
});

/**
 * Discriminated union of all feat types
 * Ensures type safety while allowing different schemas
 */
export const dndFeatDataSchema = z.discriminatedUnion('category', [
  originFeatSchema,
  generalFeatSchema,
  fightingStyleFeatSchema,
  epicBoonFeatSchema
]);

/**
 * D&D Feat document schema (runtime)
 * Extends base VTT document with feat-specific plugin data
 */
export const dndFeatDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('feat'),
  pluginData: dndFeatDataSchema
});

/**
 * Runtime type exports
 */
export type DndFeatData = z.infer<typeof dndFeatDataSchema>;
export type DndFeatDocument = z.infer<typeof dndFeatDocumentSchema>;
export type OriginFeat = z.infer<typeof originFeatSchema>;
export type GeneralFeat = z.infer<typeof generalFeatSchema>;
export type FightingStyleFeat = z.infer<typeof fightingStyleFeatSchema>;
export type EpicBoonFeat = z.infer<typeof epicBoonFeatSchema>;