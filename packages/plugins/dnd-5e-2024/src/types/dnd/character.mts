import { z } from 'zod';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import {
  speciesReferenceSchema,
  backgroundReferenceSchema,
  classReferenceSchema,
  spellReferenceSchema,
  featReferenceSchema,
  itemReferenceSchema,
  abilitySchema,
  skillSchema,
  restTypeSchema,
  spellPreparationSchema,
  alignmentSchema,
  creatureSizeSchema,
  armorProficiencySchema,
  weaponProficiencySchema,
  languageSchema
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
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  dexterity: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  constitution: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  intelligence: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  wisdom: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  }),
  charisma: z.object({
    base: z.number().min(1).max(30),
    racial: z.number().default(0),
    enhancement: z.number().default(0),
    override: z.number().optional(),
    saveProficient: z.boolean().default(false),
    saveBonus: z.number().default(0)
  })
});

/**
 * Skills with full proficiency tracking
 */
export const characterSkillsSchema = z.record(skillSchema, z.object({
  proficient: z.boolean().default(false),
  expert: z.boolean().default(false),
  bonus: z.number().default(0),
  advantage: z.boolean().default(false),
  disadvantage: z.boolean().default(false)
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
    _ref: spellReferenceSchema,
    level: z.number().min(0).max(9),
    class: z.string(),
    prepared: z.boolean().default(true),
    alwaysPrepared: z.boolean().default(false)
  })).default([]),
  
  /** Cantrips */
  cantrips: z.array(z.object({
    _ref: spellReferenceSchema,
    class: z.string()
  })).default([])
});

/**
 * Equipment and inventory system
 */
export const characterInventorySchema = z.object({
  /** Equipped items */
  equipped: z.object({
    armor: z.object({
      _ref: itemReferenceSchema.optional(),
      ac: z.number().optional(),
      enhancementBonus: z.number().default(0)
    }).optional(),
    
    shield: z.object({
      _ref: itemReferenceSchema.optional(),
      ac: z.number().optional(),
      enhancementBonus: z.number().default(0)
    }).optional(),
    
    /** 2024: Weapon mastery tracking */
    weapons: z.array(z.object({
      _ref: itemReferenceSchema,
      slot: z.enum(['main_hand', 'off_hand', 'two_handed']),
      masteryActive: z.boolean().default(false),
      enhancementBonus: z.number().default(0)
    })).default([]),
    
    accessories: z.array(z.object({
      _ref: itemReferenceSchema,
      slot: z.string() // ring, amulet, etc.
    })).default([])
  }),
  
  /** Carried items */
  carried: z.array(z.object({
    _ref: itemReferenceSchema,
    quantity: z.number().min(1).default(1),
    identified: z.boolean().default(true),
    location: z.string().optional() // backpack, belt pouch, etc.
  })).default([]),
  
  /** Attuned magical items (max 3) */
  attunedItems: z.array(itemReferenceSchema).max(3).default([]),
  
  /** Currency */
  currency: z.object({
    platinum: z.number().min(0).default(0),
    gold: z.number().min(0).default(0),
    electrum: z.number().min(0).default(0),
    silver: z.number().min(0).default(0),
    copper: z.number().min(0).default(0)
  })
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
  
  /** Character feats */
  feats: z.array(z.object({
    _ref: featReferenceSchema,
    source: z.enum(['origin', 'asi_replacement', 'bonus']),
    level: z.number().min(1).max(20).optional()
  })).default([]),
  
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
  species: speciesReferenceSchema,
  background: backgroundReferenceSchema,
  
  /** Character classes */
  classes: z.array(z.object({
    _ref: classReferenceSchema,
    level: z.number().min(1).max(20),
    subclass: z.object({
      _ref: classReferenceSchema,
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
    armor: z.array(armorProficiencySchema).default([]),
    weapons: z.array(weaponProficiencySchema).default([]),
    tools: z.array(z.object({
      _ref: itemReferenceSchema,
      proficient: z.boolean().default(true),
      expert: z.boolean().default(false)
    })).default([]),
    languages: z.array(languageSchema).default([])
  }),
  
  /** Spellcasting */
  spellcasting: characterSpellcastingSchema.optional(),
  
  /** Inventory and equipment */
  inventory: characterInventorySchema,
  
  /** Features and feats */
  features: characterFeaturesSchema,
  
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
 * Extends base Actor document with character-specific plugin data
 */
export const dndCharacterDocumentSchema = actorSchema.extend({
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
export type CharacterInventory = z.infer<typeof characterInventorySchema>;
export type CharacterFeatures = z.infer<typeof characterFeaturesSchema>;