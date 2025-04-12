import { z } from 'zod';
import { abilitySchema } from './common.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';


// Basic schemas
const benefitSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const skillChoiceSchema = z.object({
  type: z.literal('choice'),
  count: z.number().int().min(0),
  options: z.array(z.string()),
});

const equipmentChoiceSchema = z.object({
  item: z.string().optional(),
  equipmenttype: z.string().optional(),
  source: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  value: z.number().optional(),
});

const equipmentDataSchema = z.object({
  type: z.literal('choice'),
  options: z.record(z.string(), z.array(equipmentChoiceSchema)),
  description: z.array(z.string()),
});

const featureDataSchema = z.object({
  name: z.string(),
  source: z.string(),
  description: z.string().optional(),
  benefits: z.array(benefitSchema).optional(),
  gainsubclassfeature: z.boolean().optional(),
});

const spellDataSchema = z.object({
  name: z.string(),
  source: z.string(),
  tag: z.string().optional(),
  resourceName: z.string().optional(),
  resourceAmount: z.number().optional(),
});

const spellChoiceSchema = z.object({
  type: z.literal('choice'),
  levels: z.array(z.number()).optional(),
  count: z.number().optional(),
  classes: z.array(z.string()).optional(),
  schools: z.array(z.string()).optional(),
}).catchall(z.any());

const spellEntrySchema = z.object({
  prepared: z.record(z.string(), z.array(z.union([spellDataSchema, spellChoiceSchema]))).optional(),
  known: z.record(z.string(), z.array(z.union([spellDataSchema, spellChoiceSchema]))).optional(),
  innate: z.record(z.string(), z.array(z.union([spellDataSchema, spellChoiceSchema]))).optional(),
  resourceName: z.string().optional(),
});

const subclassDataSchema = z.object({
  name: z.string(),
  shortname: z.string(),
  source: z.string(),
  classname: z.string(),
  features: z.record(z.string(), z.array(featureDataSchema)),
  additionalspells: z.array(spellEntrySchema),
});

// Main Class Data schema of "data" field in class document in the mongoose model which is returned by the API
export const characterClassDataSchema = z.object({
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
    skills: z.array(skillChoiceSchema),
  }),
  equipment: equipmentDataSchema,
  features: z.record(z.string(), z.array(featureDataSchema)),
  subclasslevel: z.number().int().positive(),
  subclassTitle: z.string(),
  subclasses: z.array(subclassDataSchema),
});

export const characterClassDocumentSchema = vttDocumentSchema.extend({
  documentType: z.literal('characterClass'),
  data: characterClassDataSchema
});

// Export all types
export type IBenefit = z.infer<typeof benefitSchema>;
export type ISkillChoice = z.infer<typeof skillChoiceSchema>;
export type IEquipmentChoice = z.infer<typeof equipmentChoiceSchema>;
export type IEquipmentData = z.infer<typeof equipmentDataSchema>;
export type IFeatureData = z.infer<typeof featureDataSchema>;
export type ISpellData = z.infer<typeof spellDataSchema>;
export type ISpellChoice = z.infer<typeof spellChoiceSchema>;
export type ISpellEntry = z.infer<typeof spellEntrySchema>;
export type ISubclassData = z.infer<typeof subclassDataSchema>;
export type ICharacterClassData = z.infer<typeof characterClassDataSchema>;
export type ICharacterClassDocument = z.infer<typeof characterClassDocumentSchema>;