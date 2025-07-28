import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { 
  abilitySchema,
  spellSchoolSchema,
  spellClassAvailabilitySchema,
  spellComponentsSchema,
  spellScalingSchema,
  damageTypeSchema,
  saveEffectSchema
} from './common.mjs';

/**
 * D&D 5e Spell Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D 5e 2024 Spell Runtime Types
 * 
 * Updated for 2024 spell format with better class availability tracking,
 * enhanced damage/scaling systems, and proper component handling.
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
  
  /** Spell level (0 for cantrips, 1-9 for spells) */
  level: z.number().min(0).max(9),
  
  /** School of magic */
  school: spellSchoolSchema,
  
  /** 2024: Class availability in SRD format */
  classAvailability: spellClassAvailabilitySchema,
  
  /** Casting mechanics */
  castingTime: z.string(), // e.g., "Action", "1 minute", "1 reaction"
  range: z.string(), // e.g., "90 feet", "Self", "Touch"
  components: spellComponentsSchema,
  duration: z.string(), // e.g., "Instantaneous", "10 minutes", "24 hours"
  
  /** Whether this spell can be cast as a ritual */
  ritual: z.boolean().default(false),
  
  /** Whether this spell requires concentration */
  concentration: z.boolean().default(false),
  
  /** How the spell scales at higher levels or character levels */
  scaling: spellScalingSchema.optional(),
  
  /** Basic damage information (if applicable) */
  damage: z.object({
    dice: z.string(), // e.g., "4d4", "1d6"
    type: damageTypeSchema
  }).optional(),
  
  /** Saving throw information (if applicable) */
  savingThrow: z.object({
    ability: abilitySchema,
    effectOnSave: saveEffectSchema,
    description: z.string().optional()
  }).optional(),
  
  /** Attack roll information (if applicable) */
  attackRoll: z.object({
    type: z.enum(['melee', 'ranged']),
    description: z.string().optional()
  }).optional(),
  
  /** Area of effect (if applicable) */
  areaOfEffect: z.object({
    type: z.enum(['sphere', 'cube', 'cylinder', 'cone', 'line']),
    size: z.number(),
    description: z.string().optional()
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Spell document schema (runtime)
 * Extends base VTT document with spell-specific plugin data
 */
export const dndSpellDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('spell'),
  pluginData: dndSpellDataSchema
});

/**
 * Runtime type exports
 */
export type DndSpellData = z.infer<typeof dndSpellDataSchema>;
export type DndSpellDocument = z.infer<typeof dndSpellDocumentSchema>;

/**
 * Spell school identifiers (from common.mts)
 */
export const spellSchoolIdentifiers = [
  'abjuration', 'conjuration', 'divination', 'enchantment', 
  'evocation', 'illusion', 'necromancy', 'transmutation'
] as const;

export type SpellSchoolIdentifier = (typeof spellSchoolIdentifiers)[number];

/**
 * Spell level identifiers (0-9)
 */
export const spellLevelIdentifiers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type SpellLevelIdentifier = (typeof spellLevelIdentifiers)[number];

