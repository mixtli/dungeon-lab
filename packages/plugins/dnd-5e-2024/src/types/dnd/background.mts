import { z } from 'zod';
import { documentReferenceSchema } from '../utils.mjs';

/**
 * D&D 5e Background Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Ability score improvement schema for 2024 D&D backgrounds
 */
export const abilityScoreImprovementSchema = z.object({
  type: z.enum(['weighted', 'fixed', 'choice']),
  choices: z.array(z.object({
    from: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])),
    weights: z.array(z.number()),
    total: z.number().optional()
  }))
});

/**
 * Equipment option schema for background starting equipment
 */
export const equipmentOptionSchema = z.object({
  label: z.string(), // "A", "B", etc.
  items: z.array(z.union([
    z.object({
      _ref: documentReferenceSchema, // item document reference
      quantity: z.number().optional(),
      displayName: z.string().optional()
    }),
    z.object({
      value: z.number() // gold pieces
    }),
    z.object({
      _ref: documentReferenceSchema, // special item document reference
      special: z.literal(true), // marker to indicate special item
      quantity: z.number().optional(),
      displayName: z.string().optional()
    })
  ]))
});

/**
 * Equipment choice schema
 */
export const equipmentChoiceSchema = z.object({
  type: z.literal('choice'),
  options: z.array(equipmentOptionSchema)
});

/**
 * Background feat schema (uses explicit document references)
 */
export const dndBackgroundFeatSchema = z.object({
  _ref: documentReferenceSchema,
  displayName: z.string()
});

/**
 * Skill proficiency schema (uses explicit document references)
 */
export const dndSkillProficiencySchema = z.object({
  _ref: documentReferenceSchema,
  displayName: z.string()
});

/**
 * Tool proficiency schema (uses explicit document references)
 */
export const dndToolProficiencySchema = z.object({
  _ref: documentReferenceSchema,
  displayName: z.string()
});

/**
 * Language proficiency schema (uses explicit document references)
 */
export const dndLanguageProficiencySchema = z.object({
  _ref: documentReferenceSchema,
  displayName: z.string(),
  count: z.number().optional() // for "any X languages"
});

/**
 * Background feature schema
 */
export const backgroundFeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(['feature', 'specialty', 'contact', 'benefit']).default('feature')
});

/**
 * Suggested characteristics schema
 */
export const suggestedCharacteristicsSchema = z.object({
  personalityTraits: z.array(z.string()).optional(),
  ideals: z.array(z.string()).optional(),
  bonds: z.array(z.string()).optional(),
  flaws: z.array(z.string()).optional()
});

/**
 * D&D Background runtime data schema
 * This is the canonical structure for backgrounds in MongoDB
 */
export const dndBackgroundDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  // 2024 D&D ability score improvements
  abilityScoreImprovements: z.array(abilityScoreImprovementSchema).optional(),
  
  // Background feats (new in 2024)
  feats: z.array(dndBackgroundFeatSchema).optional(),
  
  // Proficiencies with document references
  skillProficiencies: z.array(dndSkillProficiencySchema).optional(),
  toolProficiencies: z.array(dndToolProficiencySchema).optional(),
  languageProficiencies: z.array(dndLanguageProficiencySchema).optional(),
  
  // Enhanced equipment system
  startingEquipment: z.union([
    z.array(z.object({ _ref: documentReferenceSchema })), // legacy simple list with item references wrapped
    equipmentChoiceSchema // new choice system
  ]).optional(),
  
  // Background feature
  feature: backgroundFeatureSchema.optional(),
  
  // Suggested characteristics for roleplaying
  suggestedCharacteristics: suggestedCharacteristicsSchema.optional(),
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Background document schema (runtime)
 */
// Note: Background documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndBackgroundDocumentSchema = dndBackgroundDataSchema;

/**
 * Runtime type exports
 */
export type DndBackgroundData = z.infer<typeof dndBackgroundDataSchema>;
export type DndBackgroundDocument = z.infer<typeof dndBackgroundDocumentSchema>;
export type DndAbilityScoreImprovement = z.infer<typeof abilityScoreImprovementSchema>;
export type DndBackgroundEquipmentChoice = z.infer<typeof equipmentChoiceSchema>;
export type DndBackgroundEquipmentOption = z.infer<typeof equipmentOptionSchema>;
export type DndBackgroundFeat = z.infer<typeof dndBackgroundFeatSchema>;
export type DndSkillProficiency = z.infer<typeof dndSkillProficiencySchema>;
export type DndToolProficiency = z.infer<typeof dndToolProficiencySchema>;
export type DndLanguageProficiency = z.infer<typeof dndLanguageProficiencySchema>;
export type DndBackgroundFeature = z.infer<typeof backgroundFeatureSchema>;
export type DndSuggestedCharacteristics = z.infer<typeof suggestedCharacteristicsSchema>;

/**
 * Background identifiers from D&D 5e 2024
 */
export const backgroundIdentifiers = [
  'acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'folk-hero',
  'hermit', 'noble', 'outlander', 'sage', 'sailor', 'soldier'
] as const;

export type BackgroundIdentifier = typeof backgroundIdentifiers[number];