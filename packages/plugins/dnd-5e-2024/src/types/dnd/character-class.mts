import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { abilitySchema, restTypeSchema, spellcastingAbilitySchema, spellcastingTypeSchema, spellPreparationSchema, spellReferenceObjectSchema, itemReferenceObjectSchema } from './common.mjs';

/**
 * D&D 5e 2024 Character Class Runtime Types
 * 
 * Updated for 2024 features including weapon mastery, 4 subclasses per class,
 * and enhanced class feature systems.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Filter constraint for complex proficiency requirements
 * Parsed from 5etools {@filter} syntax like:
 * "Martial weapons that have the {@filter Finesse or Light|items|type=martial weapon|property=finesse;light} property"
 */
export const proficiencyFilterConstraintSchema = z.object({
  /** Display text shown to users */
  displayText: z.string(),
  /** Base item type constraint (e.g., "martial weapon", "simple weapon") */
  itemType: z.string().optional(),
  /** Weapon category constraint (e.g., "martial", "simple") */
  category: z.string().optional(),
  /** Required weapon properties (e.g., ["finesse", "light"]) */
  properties: z.array(z.string()).optional(),
  /** Additional filter parameters */
  additionalFilters: z.record(z.string(), z.any()).optional()
});

/**
 * Enhanced proficiency entry supporting three types:
 * 1. Simple string (e.g., "simple", "light armor")
 * 2. Document reference (e.g., Thieves' Tools)
 * 3. Filter constraint (e.g., martial weapons with finesse or light property)
 */
export const proficiencyEntrySchema = z.union([
  // Simple string proficiency
  z.string(),
  // Document reference proficiency (items like tools)
  z.object({
    type: z.literal('reference'),
    item: itemReferenceObjectSchema,
    displayText: z.string()
  }),
  // Filter constraint proficiency (complex weapon filters)
  z.object({
    type: z.literal('filter'),
    constraint: proficiencyFilterConstraintSchema
  })
]);

/**
 * 2024 Weapon Mastery system
 * Certain classes can "master" weapons for additional effects
 */
export const weaponMasterySchema = z.object({
  /** Weapons this class can master */
  availableWeapons: z.array(z.string()),
  /** Number of weapons that can be mastered simultaneously */
  maxMasteries: z.number(),
  /** Level at which weapon mastery is gained */
  gainedAtLevel: z.number(),
  /** How mastery options can be changed */
  changeRules: z.string() // e.g., "on long rest", "on level up"
});

/**
 * Class feature with level requirements and descriptions
 */
export const classFeatureSchema = z.object({
  name: z.string(),
  level: z.number().min(1).max(20),
  description: z.string(),
  /** Whether this feature has limited uses */
  uses: z.object({
    value: z.number(),
    per: restTypeSchema,
    /** How uses scale with level */
    scaling: z.string().optional()
  }).optional(),
  /** Whether this feature provides choices */
  choices: z.array(z.object({
    name: z.string(),
    description: z.string()
  })).optional(),
  /** Whether this feature grants a subclass choice */
  grantsSubclass: z.boolean()
});

/**
 * 2024 Subclass structure (exactly 4 per class)
 */
export const subclassSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Level at which subclass is chosen (usually 3, sometimes 1 or 2) */
  gainedAtLevel: z.number(),
  /** Subclass-specific features as flat array */
  features: z.array(classFeatureSchema),
  /** Additional spells by character level (if applicable) */
  additionalSpells: z.record(z.string(), z.array(z.object({
    type: z.enum(['known', 'prepared', 'innate']),
    source: z.enum(['specific', 'choice']),
    /** For specific spells */
    spell: spellReferenceObjectSchema.optional(),
    /** For spell choices */
    choice: z.object({
      maxLevel: z.number(),
      class: z.string().optional(),
      school: z.string().optional(),
      count: z.number().default(1).optional()
    }).optional()
  }))).optional()
});

/**
 * Complete D&D 2024 Character Class Schema
 */
export const dndCharacterClassDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** Primary ability scores for this class */
  primaryAbilities: z.array(abilitySchema),
  
  /** Hit die for this class */
  hitDie: z.number(), // e.g., 8 for d8, 10 for d10
  
  /** Proficiencies granted at 1st level */
  proficiencies: z.object({
    armor: z.array(proficiencyEntrySchema),
    weapons: z.array(proficiencyEntrySchema),
    tools: z.array(proficiencyEntrySchema),
    savingThrows: z.array(abilitySchema),
    skills: z.object({
      count: z.number(),
      choices: z.array(z.string())
    })
  }),
  
  /** 2024: Weapon Mastery (if applicable) */
  weaponMastery: weaponMasterySchema.optional(),
  
  /** Class features as flat array */
  features: z.array(classFeatureSchema),
  
  /** 2024: Exactly 4 subclasses in core PHB */
  subclasses: z.array(subclassSchema).length(4),
  
  /** Spellcasting information (if applicable) */
  spellcasting: z.object({
    ability: spellcastingAbilitySchema,
    type: spellcastingTypeSchema,
    /** Spells known vs prepared */
    preparation: spellPreparationSchema,
    /** Spell list access */
    spellList: z.string(),
    /** Cantrips known progression */
    cantripsKnown: z.record(z.string(), z.number()).optional(),
    /** Spells known progression (if applicable) */
    spellsKnown: z.record(z.string(), z.number()).optional()
  }).optional(),
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Character Class document schema (runtime)
 * Extends base VTT document with character class-specific plugin data
 */
export const dndCharacterClassDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('character-class'),
  pluginData: dndCharacterClassDataSchema
});

/**
 * Runtime type exports
 */
export type ProficiencyFilterConstraint = z.infer<typeof proficiencyFilterConstraintSchema>;
export type ProficiencyEntry = z.infer<typeof proficiencyEntrySchema>;
export type WeaponMastery = z.infer<typeof weaponMasterySchema>;
export type ClassFeature = z.infer<typeof classFeatureSchema>;
export type Subclass = z.infer<typeof subclassSchema>;
export type DndCharacterClassData = z.infer<typeof dndCharacterClassDataSchema>;
export type DndCharacterClassDocument = z.infer<typeof dndCharacterClassDocumentSchema>;

/**
 * D&D 2024 Classes (12 total, same as 2014)
 */
export const characterClassIdentifiers = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'
] as const;

export type CharacterClassIdentifier = typeof characterClassIdentifiers[number];