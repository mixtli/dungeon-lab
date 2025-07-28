import { z } from 'zod';

/**
 * D&D 5e Spell Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Spell runtime data schema
 * This is the canonical structure for spells in MongoDB
 */
export const dndSpellDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Spell mechanics */
  level: z.number().min(0).max(9),
  school: z.enum(['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation']),
  castingTime: z.string(),
  range: z.string(),
  components: z.object({
    verbal: z.boolean().optional(),
    somatic: z.boolean().optional(),
    material: z.boolean().optional(),
    materialComponents: z.string().optional()
  }).optional(),
  duration: z.string(),
  concentration: z.boolean().optional(),
  ritual: z.boolean().optional(),
  
  /** Spell effects */
  damage: z.object({
    type: z.string(),
    dice: z.string(),
    scaling: z.string().optional()
  }).optional(),
  savingThrow: z.object({
    ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
    effect: z.string()
  }).optional(),
  attackRoll: z.boolean().optional(),
  
  /** Spell lists */
  classes: z.array(z.string()).optional(),
  
  /** Higher level effects */
  higherLevels: z.string().optional(),
  
  /** Tags for organization */
  tags: z.array(z.string()).optional()
});

/**
 * D&D Spell document schema (runtime)
 */
// Note: Spell documents should use the standard vttDocumentSchema from shared
// This is just the plugin data schema
export const dndSpellDocumentSchema = dndSpellDataSchema;

/**
 * Runtime type exports
 */
export type DndSpellData = z.infer<typeof dndSpellDataSchema>;
export type DndSpellDocument = z.infer<typeof dndSpellDocumentSchema>;

/**
 * Spell school identifiers
 */
export const spellSchoolIdentifiers = [
  'abjuration', 'conjuration', 'divination', 'enchantment', 
  'evocation', 'illusion', 'necromancy', 'transmutation'
] as const;

export type SpellSchoolIdentifier = (typeof spellSchoolIdentifiers)[number];