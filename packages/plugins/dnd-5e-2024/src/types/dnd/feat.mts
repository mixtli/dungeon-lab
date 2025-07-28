import { z } from 'zod';

/**
 * D&D 5e Feat Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Feat ability choice schema
 */
export const featAbilityChoiceSchema = z.object({
  choice: z.object({
    from: z.array(z.string()),
    count: z.number().optional()
  })
});

/**
 * Feat prerequisites schema
 */
export const featPrerequisitesSchema = z.object({
  ability: z.record(z.string(), z.number()).optional(),
  race: z.array(z.string()).optional(),
  class: z.array(z.string()).optional(),
  level: z.number().optional(),
  spellcasting: z.boolean().optional(),
  other: z.string().optional()
});

/**
 * Feat benefit schema
 */
export const featBenefitSchema = z.object({
  name: z.string(),
  description: z.string()
});

/**
 * D&D Feat runtime data schema
 * This is the canonical structure for feats in MongoDB
 */
export const dndFeatDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
  ability: z.array(featAbilityChoiceSchema).optional(),
  prerequisites: featPrerequisitesSchema.optional(),
  benefits: z.array(featBenefitSchema),
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Feat document schema (runtime)
 */
// Note: Feat documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndFeatDocumentSchema = dndFeatDataSchema;

/**
 * Runtime type exports
 */
export type DndFeatData = z.infer<typeof dndFeatDataSchema>;
export type DndFeatDocument = z.infer<typeof dndFeatDocumentSchema>;
export type DndFeatAbilityChoice = z.infer<typeof featAbilityChoiceSchema>;
export type DndFeatPrerequisites = z.infer<typeof featPrerequisitesSchema>;
export type DndFeatBenefit = z.infer<typeof featBenefitSchema>;