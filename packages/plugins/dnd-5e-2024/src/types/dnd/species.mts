import { z } from 'zod';

/**
 * D&D 5e Species Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Species trait schema
 */
export const speciesTraitSchema = z.object({
  name: z.string(),
  description: z.string()
});

/**
 * Species spell schema
 */
export const speciesSpellSchema = z.object({
  name: z.string().optional(),
  cantrips: z.array(z.string()),
  spells: z.array(z.object({
    level: z.number(),
    spells: z.array(z.string())
  }))
});

/**
 * Subspecies schema
 */
export const subspeciesSchema = z.object({
  name: z.string(),
  description: z.string(),
  speed: z.number().optional(),
  abilityScoreIncrease: z.record(z.string(), z.number()).optional(),
  traits: z.array(speciesTraitSchema).optional(),
  spells: z.array(speciesSpellSchema).optional()
});

/**
 * D&D Species runtime data schema
 * This is the canonical structure for species in MongoDB
 */
export const dndSpeciesDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge']),
  speed: z.number(),
  traits: z.array(speciesTraitSchema),
  subspecies: z.array(subspeciesSchema).optional(),
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Species document schema (runtime)
 */
// Note: Species documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndSpeciesDocumentSchema = dndSpeciesDataSchema;

/**
 * Runtime type exports
 */
export type DndSpeciesData = z.infer<typeof dndSpeciesDataSchema>;
export type DndSpeciesDocument = z.infer<typeof dndSpeciesDocumentSchema>;
export type DndSpeciesTrait = z.infer<typeof speciesTraitSchema>;
export type DndSpeciesSpell = z.infer<typeof speciesSpellSchema>;
export type DndSubspecies = z.infer<typeof subspeciesSchema>;