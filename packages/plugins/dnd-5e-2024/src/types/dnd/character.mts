import { z } from 'zod';
import { characterSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { referenceOrObjectIdSchema } from '@dungeon-lab/shared/types/reference.mjs';
import {
  abilitySchema,
  skillSchema,
  restTypeSchema,
  spellPreparationSchema,
  alignmentSchema,
  creatureSizeSchema,
  armorProficiencySchema,
  proficiencyEntrySchema
} from './common.mjs';

/**
 * D&D 5e 2024 Player Character Runtime Types
 * 
 * Complete D&D 2024 character schema with proper integration of all systems:
 * species, backgrounds, classes, spells, feats, equipment, and more.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Character progression tracking
 */
export const characterProgressionSchema = z.object({
  /** Total character level (1-20) */
  level: z.number().min(1).max(20),
  
  /** Experience points */
  experiencePoints: z.number().min(0).default(0),
  
  /** Calculated proficiency bonus based on level */
  proficiencyBonus: z.number().min(2).max(6),
  
  /** Class levels for multiclassing */
  classLevels: z.record(z.string(), z.number().min(1).max(20)),
  
  /** Hit dice by class */
  hitDice: z.record(z.string(), z.object({
    total: z.number(),
    used: z.number()
  }))
});

/**
 * Character core attributes (enhanced from current implementation)
 */
export const characterAttributesSchema = z.object({
  /** Hit points */
  hitPoints: z.object({
    current: z.number().min(0),
    maximum: z.number().min(1),
    temporary: z.number().min(0).default(0)
  }),
  
  /** Armor Class with multiple calculation methods */
  armorClass: z.object({
    value: z.number().min(1),
    calculation: z.enum(['natural', 'armor', 'mage_armor', 'unarmored_defense']),
    sources: z.array(z.string()).optional()
  }),
  
  /** Initiative */
  initiative: z.object({
    bonus: z.number(),
    advantage: z.boolean().default(false)
  }),
  
  /** Movement speeds */
  movement: z.object({
    walk: z.number().default(30),
    fly: z.number().optional(),
    swim: z.number().optional(),
    climb: z.number().optional(),
    burrow: z.number().optional(),
    hover: z.boolean().optional()
  }),
  
  /** Death saves */
  deathSaves: z.object({
    successes: z.number().min(0).max(3).default(0),
    failures: z.number().min(0).max(3).default(0)
  }),
  
  /** Other attributes */
  exhaustion: z.number().min(0).max(6).default(0),
  inspiration: z.boolean().default(false)
});

/**
 * Ability scores with full 2024 support
 */
export const characterAbilitiesSchema = z.object({
  strength: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    modifier: z.number(),
    total: z.number(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  dexterity: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    modifier: z.number(),
    total: z.number(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  constitution: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    modifier: z.number(),
    total: z.number(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  intelligence: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    modifier: z.number(),
    total: z.number(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  wisdom: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    modifier: z.number(),
    total: z.number(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  charisma: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    modifier: z.number(),
    total: z.number(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  })
});

/**
 * Skills with proficiency tracking (expert requires proficient)
 */
export const characterSkillsSchema = z.record(skillSchema, z.object({
  proficient: z.boolean().default(false),
  expert: z.boolean().default(false)
}));

/**
 * 2024 Spellcasting system
 */
export const characterSpellcastingSchema = z.object({
  /** Spellcasting classes */
  classes: z.record(z.string(), z.object({
    ability: abilitySchema,
    spellcastingLevel: z.number().min(0).max(20),
    spellSaveDC: z.number(),
    spellAttackBonus: z.number(),
    preparation: spellPreparationSchema
  })),
  
  /** Spell slots by level */
  spellSlots: z.record(z.string(), z.object({
    total: z.number().min(0),
    used: z.number().min(0)
  })),
  
  /** Known/prepared spells */
  spells: z.array(z.object({
    name: z.string(),
    spell: z.string(),
    level: z.number().min(0).max(9),
    class: z.string(),
    prepared: z.boolean().default(true),
    alwaysPrepared: z.boolean().default(false)
  })).default([]),
  
  /** Cantrips */
  cantrips: z.array(z.object({
    name: z.string(),
    spell: z.string(),
    class: z.string()
  })).default([])
});

/**
 * Character currency schema
 * 
 * Equipment state moved to individual Item documents using itemState field.
 * Character only tracks currency directly, no inventory structure needed.
 */
export const characterCurrencySchema = z.object({
  platinum: z.number().min(0).default(0),
  gold: z.number().min(0).default(0),
  electrum: z.number().min(0).default(0),
  silver: z.number().min(0).default(0),
  copper: z.number().min(0).default(0)
});

/**
 * Character features and feats
 */
export const characterFeaturesSchema = z.object({
  /** Class features by level */
  classFeatures: z.array(z.object({
    name: z.string(),
    class: z.string(),
    level: z.number().min(1).max(20),
    description: z.string().optional(),
    uses: z.object({
      current: z.number().min(0),
      maximum: z.number().min(0),
      per: restTypeSchema
    }).optional()
  })).default([]),
  
  /** Character feats - array of resolved feat ObjectIds */
  feats: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid ObjectId')).default([]),
  
  /** Species traits */
  speciesTraits: z.array(z.object({
    name: z.string(),
    description: z.string(),
    uses: z.object({
      current: z.number().min(0),
      maximum: z.number().min(0),
      per: restTypeSchema
    }).optional()
  })).default([])
});

/**
 * Complete D&D 2024 Character Schema
 */
export const dndCharacterDataSchema = z.object({
  /** Basic information */
  name: z.string(),
  
  /** Character origin (2024 system) */
  species: referenceOrObjectIdSchema,
  background: referenceOrObjectIdSchema,
  
  /** Selected lineage/subspecies (e.g., "Drow" for Elves) */
  lineage: z.string().optional(),
  
  /** Character classes */
  classes: z.array(z.object({
    class: referenceOrObjectIdSchema,
    level: z.number().min(1).max(20),
    subclass: z.object({
      subclass: referenceOrObjectIdSchema,
      level: z.number().min(1).max(20)
    }).optional(),
    hitPointsRolled: z.array(z.number()).optional()
  })).min(1),
  
  /** Character progression */
  progression: characterProgressionSchema,
  
  /** Core attributes */
  attributes: characterAttributesSchema,
  
  /** Ability scores */
  abilities: characterAbilitiesSchema,
  
  /** Skills */
  skills: characterSkillsSchema,
  
  /** Proficiencies */
  proficiencies: z.object({
    // Armor proficiencies - simple enum values only
    // Characters either have proficiency with an armor category or they don't
    armor: z.array(armorProficiencySchema).default([]),
    
    // Weapon proficiencies - resolved from class/background choices
    // Should contain only referenceOrObjectId or filter objects
    // MUST NOT contain group-choice objects (choices should be resolved)
    weapons: z.array(proficiencyEntrySchema).default([]),
    
    // Tool proficiencies - resolved from class/background choices with expertise tracking
    // Each tool tracks both proficiency and expertise status (rogues can get expertise)
    // Supports ObjectId strings (resolved), reference objects (unresolved), and filter objects
    tools: z.array(z.object({
      tool: proficiencyEntrySchema,
      proficient: z.boolean().default(true),
      expert: z.boolean().default(false)
    })).default([]),
    
    // Language proficiencies - always specific language references
    languages: z.array(referenceOrObjectIdSchema).default([])
  }),
  
  /** Spellcasting */
  spellcasting: characterSpellcastingSchema.optional(),
  
  /** Character currency */
  currency: characterCurrencySchema,
  
  /** Features and feats */
  features: characterFeaturesSchema,
  
  /** Equipment slots */
  equipment: z.object({
    armor: z.string().nullable().optional(),        // item ID
    shield: z.string().nullable().optional(),       // item ID  
    mainHand: z.string().nullable().optional(),     // weapon item ID
    offHand: z.string().nullable().optional(),      // weapon item ID
    twoHanded: z.string().nullable().optional()     // weapon item ID (mutually exclusive)
  }).optional(),
  
  /** Roleplaying information */
  roleplay: z.object({
    alignment: alignmentSchema.optional(),
    personality: z.string().default(''),
    ideals: z.string().default(''),
    bonds: z.string().default(''),
    flaws: z.string().default(''),
    appearance: z.string().default(''),
    backstory: z.string().default('')
  }),
  
  /** Character size */
  size: creatureSizeSchema,
  
  /** Source information */
  source: z.string().optional(),
  creationDate: z.date().optional(),
  lastModified: z.date().optional()
});

/**
 * D&D Character document schema (runtime)
 * Extends base Character document with character-specific plugin data
 */
export const dndCharacterDocumentSchema = characterSchema.extend({
  pluginData: dndCharacterDataSchema
});

/**
 * Runtime type exports
 */
export type DndCharacterData = z.infer<typeof dndCharacterDataSchema>;
export type DndCharacterDocument = z.infer<typeof dndCharacterDocumentSchema>;


// Additional helper type exports
export type CharacterProgression = z.infer<typeof characterProgressionSchema>;
export type CharacterAttributes = z.infer<typeof characterAttributesSchema>;
export type CharacterAbilities = z.infer<typeof characterAbilitiesSchema>;
export type CharacterSkills = z.infer<typeof characterSkillsSchema>;
export type CharacterSpellcasting = z.infer<typeof characterSpellcastingSchema>;
export type CharacterCurrency = z.infer<typeof characterCurrencySchema>;
export type CharacterFeatures = z.infer<typeof characterFeaturesSchema>;