import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { abilitySchema, restTypeSchema, spellcastingAbilitySchema, spellcastingTypeSchema, spellPreparationSchema } from './common.mjs';

/**
 * D&D 5e 2024 Character Class Runtime Types
 * 
 * Updated for 2024 features including weapon mastery, 4 subclasses per class,
 * and enhanced class feature systems.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

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
  })).optional()
});

/**
 * 2024 Subclass structure (exactly 4 per class)
 */
export const subclassSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Level at which subclass is chosen (usually 3, sometimes 1 or 2) */
  gainedAtLevel: z.number(),
  /** Subclass-specific features by level */
  features: z.record(z.string(), z.array(classFeatureSchema)),
  /** Additional spells known (if applicable) */
  additionalSpells: z.array(z.object({
    level: z.number(),
    spells: z.array(z.string())
  })).optional()
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
    armor: z.array(z.string()),
    weapons: z.array(z.string()),
    tools: z.array(z.string()),
    savingThrows: z.array(abilitySchema),
    skills: z.object({
      count: z.number(),
      choices: z.array(z.string())
    })
  }),
  
  /** 2024: Weapon Mastery (if applicable) */
  weaponMastery: weaponMasterySchema.optional(),
  
  /** Class features by level */
  features: z.record(z.string(), z.array(classFeatureSchema)),
  
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