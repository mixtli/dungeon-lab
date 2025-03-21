import { z } from '@dungeon-lab/shared/lib/zod.mjs';



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
  type: z.literal('choice'),
  equipmenttype: z.string().optional(),
  item: z.string().optional(),
  source: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  value: z.number().optional(),
});

const equipmentDataSchema = z.object({
  choices: z.array(equipmentChoiceSchema),
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
});

const spellChoiceSchema = z.object({
  type: z.literal('choice'),
}).catchall(z.any());

const spellEntrySchema = z.object({
  prepared: z.record(z.string(), z.array(spellDataSchema)).optional(),
  known: z.record(z.string(), z.array(z.union([spellDataSchema, spellChoiceSchema]))).optional(),
  innate: z.record(z.string(), z.array(spellDataSchema)).optional(),
});

const subclassDataSchema = z.object({
  name: z.string(),
  shortname: z.string(),
  source: z.string(),
  classname: z.string(),
  features: z.record(z.string(), z.array(featureDataSchema)),
  additionalspells: z.array(spellEntrySchema),
});

// Main ClassData schema
const characterClassSchema = z.object({
  name: z.string(),
  source: z.string(),
  edition: z.string(),
  hitdie: z.string(),
  primaryability: z.array(z.string()),
  savingthrows: z.array(z.string()),
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
export type ICharacterClass = z.infer<typeof characterClassSchema>;
export { characterClassSchema };