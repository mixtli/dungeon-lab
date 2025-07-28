import { z } from 'zod';
import { abilitySchema } from './common.mjs';

/**
 * D&D 5e Character Class Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Benefit schema for class features
 */
export const dndBenefitSchema = z.object({
  name: z.string(),
  description: z.string()
});

/**
 * Skill choice schema for class proficiencies
 */
export const dndSkillChoiceSchema = z.object({
  type: z.literal('choice'),
  count: z.number().int().min(0),
  options: z.array(z.string())
});

/**
 * Equipment choice schema for class starting equipment
 */
export const dndEquipmentChoiceSchema = z.object({
  item: z.string().optional(),
  equipmenttype: z.string().optional(),
  source: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  value: z.number().optional()
});

/**
 * Equipment data schema for class equipment options
 */
export const dndEquipmentDataSchema = z.object({
  type: z.literal('choice'),
  options: z.record(z.string(), z.array(dndEquipmentChoiceSchema)),
  description: z.array(z.string())
});

/**
 * Feature data schema for class features
 */
export const dndFeatureDataSchema = z.object({
  name: z.string(),
  source: z.string(),
  description: z.string().optional(),
  benefits: z.array(dndBenefitSchema).optional(),
  gainsubclassfeature: z.boolean().optional()
});

/**
 * Spell reference schema for class spell lists (simplified)
 */
export const dndClassSpellDataSchema = z.object({
  name: z.string(),
  source: z.string(),
  tag: z.string().optional(),
  resourceName: z.string().optional(),
  resourceAmount: z.number().optional()
});

/**
 * Spell choice schema for class spell selection
 */
export const dndSpellChoiceSchema = z.object({
  type: z.literal('choice'),
  levels: z.array(z.number()).optional(),
  count: z.number().optional(),
  classes: z.array(z.string()).optional(),
  schools: z.array(z.string()).optional(),
}).catchall(z.any());

/**
 * Spell entry schema for class spell lists
 */
export const dndSpellEntrySchema = z.object({
  prepared: z.record(z.string(), z.array(z.union([dndClassSpellDataSchema, dndSpellChoiceSchema]))).optional(),
  known: z.record(z.string(), z.array(z.union([dndClassSpellDataSchema, dndSpellChoiceSchema]))).optional(),
  innate: z.record(z.string(), z.array(z.union([dndClassSpellDataSchema, dndSpellChoiceSchema]))).optional(),
  resourceName: z.string().optional()
});

/**
 * Subclass data schema
 */
export const dndSubclassDataSchema = z.object({
  name: z.string(),
  shortname: z.string(),
  source: z.string(),
  classname: z.string(),
  features: z.record(z.string(), z.array(dndFeatureDataSchema)),
  additionalspells: z.array(dndSpellEntrySchema)
});

/**
 * D&D Character Class runtime data schema
 * This is the canonical structure for character classes in MongoDB
 */
export const dndCharacterClassDataSchema = z.object({
  name: z.string(),
  source: z.string(),
  edition: z.string(),
  hitdie: z.string(),
  primaryability: z.array(abilitySchema),
  savingthrows: z.array(abilitySchema),
  proficiencies: z.object({
    armor: z.array(z.string()),
    weapons: z.array(z.string()),
    tools: z.array(z.string()),
    skills: z.array(dndSkillChoiceSchema),
  }),
  equipment: dndEquipmentDataSchema,
  features: z.record(z.string(), z.array(dndFeatureDataSchema)),
  subclasslevel: z.number().int().positive(),
  subclassTitle: z.string(),
  subclasses: z.array(dndSubclassDataSchema)
});

/**
 * D&D Character Class document schema (runtime)
 */
// Note: CharacterClass documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndCharacterClassDocumentSchema = dndCharacterClassDataSchema;

/**
 * Runtime type exports
 */
export type DndBenefit = z.infer<typeof dndBenefitSchema>;
export type DndSkillChoice = z.infer<typeof dndSkillChoiceSchema>;
export type DndClassEquipmentChoice = z.infer<typeof dndEquipmentChoiceSchema>;
export type DndEquipmentData = z.infer<typeof dndEquipmentDataSchema>;
export type DndFeatureData = z.infer<typeof dndFeatureDataSchema>;
export type DndClassSpellData = z.infer<typeof dndClassSpellDataSchema>;
export type DndSpellChoice = z.infer<typeof dndSpellChoiceSchema>;
export type DndSpellEntry = z.infer<typeof dndSpellEntrySchema>;
export type DndSubclassData = z.infer<typeof dndSubclassDataSchema>;
export type DndCharacterClassData = z.infer<typeof dndCharacterClassDataSchema>;
export type DndCharacterClassDocument = z.infer<typeof dndCharacterClassDocumentSchema>;

/**
 * Core D&D 5e class identifiers
 */
export const characterClassIdentifiers = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 
  'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'
] as const;

export type CharacterClassIdentifier = (typeof characterClassIdentifiers)[number];