import { z } from 'zod';
import { documentReferenceSchema } from '@dungeon-lab/shared/types/reference.mjs';


/**
 * D&D 5e 2024 Common Runtime Types and Constants
 * 
 * These are shared types and constants used across all D&D documents.
 * All document references use MongoDB 'id' fields.
 */

// Core ability scores
export const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
export const abilitySchema = z.enum(ABILITIES);
export type Ability = z.infer<typeof abilitySchema>;

// D&D 5e 2024 Skills (18 total)
export const SKILLS_2024 = [
  'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight of hand', 'stealth', 'survival'
] as const;
export const skillSchema = z.enum(SKILLS_2024);
export type Skill = z.infer<typeof skillSchema>;

// D&D 5e 2024 Damage Types
export const DAMAGE_TYPES_2024 = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
] as const;
export const damageTypeSchema = z.enum(DAMAGE_TYPES_2024);
export type DamageType = z.infer<typeof damageTypeSchema>;

// D&D 5e 2024 Conditions
export const CONDITIONS_2024 = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious'
] as const;
export const conditionSchema = z.enum(CONDITIONS_2024);
export type Condition = z.infer<typeof conditionSchema>;

// D&D 5e 2024 Languages
export const LANGUAGES_2024 = [
  'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc', 
  'abyssal', 'celestial', 'deep speech', 'draconic', 'druidic', 'ignan', 'infernal', 
  'primordial', 'sylvan', 'terran', 'undercommon', 'telepathy'
] as const;
export const languageSchema = z.enum(LANGUAGES_2024);

// D&D 5e 2024 Armor Proficiencies
export const ARMOR_PROFICIENCIES = [
  'light armor', 'medium armor', 'heavy armor', 'shields'
] as const;
export const armorProficiencySchema = z.enum(ARMOR_PROFICIENCIES);
export type ArmorProficiency = z.infer<typeof armorProficiencySchema>;

// D&D 5e 2024 Weapon Proficiencies
export const WEAPON_PROFICIENCIES = [
  'simple weapons', 'martial weapons', 'specific'
] as const;
export const weaponProficiencySchema = z.enum(WEAPON_PROFICIENCIES);
export type WeaponProficiency = z.infer<typeof weaponProficiencySchema>;
export type Language = z.infer<typeof languageSchema>;

// D&D 5e 2024 Alignments
export const ALIGNMENTS_2024 = [
  'lawful good', 'neutral good', 'chaotic good', 
  'lawful neutral', 'neutral', 'chaotic neutral', 
  'lawful evil', 'neutral evil', 'chaotic evil', 'unaligned'
] as const;
export const alignmentSchema = z.enum(ALIGNMENTS_2024);
export type Alignment = z.infer<typeof alignmentSchema>;

// Creature Sizes
export const CREATURE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;
export const creatureSizeSchema = z.enum(CREATURE_SIZES);
export type CreatureSize = z.infer<typeof creatureSizeSchema>;

// Creature Types
export const CREATURE_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental',
  'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze',
  'plant', 'undead'
] as const;
export const creatureTypeSchema = z.enum(CREATURE_TYPES);
export type CreatureType = z.infer<typeof creatureTypeSchema>;

// Schools of Magic
export const SPELL_SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation'
] as const;
export const spellSchoolSchema = z.enum(SPELL_SCHOOLS);
export type SpellSchool = z.infer<typeof spellSchoolSchema>;

// Currency Types
export const CURRENCY_TYPES = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export const currencyTypeSchema = z.enum(CURRENCY_TYPES);
export type Currency = z.infer<typeof currencyTypeSchema>;

// Rest Types for ability/resource recovery
export const REST_TYPES = ['turn', 'round', 'short rest', 'long rest', 'day'] as const;
export const restTypeSchema = z.enum(REST_TYPES);
export type RestType = z.infer<typeof restTypeSchema>;

// Magic Item Rarities
export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'] as const;
export const itemRaritySchema = z.enum(ITEM_RARITIES);
export type ItemRarity = z.infer<typeof itemRaritySchema>;

// Saving Throw Effects
export const SAVE_EFFECTS = ['none', 'half', 'negates', 'other'] as const;
export const saveEffectSchema = z.enum(SAVE_EFFECTS);
export type SaveEffect = z.infer<typeof saveEffectSchema>;

// Spellcasting Abilities (shortened versions)
export const SPELLCASTING_ABILITIES = ['int', 'wis', 'cha'] as const;
export const spellcastingAbilitySchema = z.enum(SPELLCASTING_ABILITIES);
export type SpellcastingAbility = z.infer<typeof spellcastingAbilitySchema>;

// Spellcasting Types
export const SPELLCASTING_TYPES = ['full', 'half', 'third', 'pact', 'none'] as const;
export const spellcastingTypeSchema = z.enum(SPELLCASTING_TYPES);
export type SpellcastingType = z.infer<typeof spellcastingTypeSchema>;

// Spell Preparation Types
export const SPELL_PREPARATION_TYPES = ['known', 'prepared', 'both'] as const;
export const spellPreparationSchema = z.enum(SPELL_PREPARATION_TYPES);
export type SpellPreparationType = z.infer<typeof spellPreparationSchema>;

// Physical Damage Types (subset of all damage types)
export const PHYSICAL_DAMAGE_TYPES = ['slashing', 'piercing', 'bludgeoning'] as const;
export const physicalDamageTypeSchema = z.enum(PHYSICAL_DAMAGE_TYPES);
export type PhysicalDamageType = z.infer<typeof physicalDamageTypeSchema>;

// Equipment Categories
export const EQUIPMENT_CATEGORIES = ['adventuring-gear', 'tool', 'container', 'consumable'] as const;
export const equipmentCategorySchema = z.enum(EQUIPMENT_CATEGORIES);
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;

// Roll Advantage/Disadvantage
export const ROLL_MODIFIERS = ['advantage', 'disadvantage'] as const;
export const rollModifierSchema = z.enum(ROLL_MODIFIERS);
export type RollModifier = z.infer<typeof rollModifierSchema>;

// Duration Types
export const DURATION_TYPES = ['instantaneous', 'until_end_of_turn', 'until_start_of_turn', 'time_based', 'until_removed'] as const;
export const durationTypeSchema = z.enum(DURATION_TYPES);
export type DurationType = z.infer<typeof durationTypeSchema>;

// Area of Effect Shapes
export const AOE_SHAPES = ['sphere', 'cube', 'cylinder', 'cone', 'line'] as const;
export const aoeShapeSchema = z.enum(AOE_SHAPES);
export type AoeShape = z.infer<typeof aoeShapeSchema>;

// Armor Types for proficiency requirements
export const ARMOR_TYPES = ['light', 'medium', 'heavy', 'shield'] as const;
export const armorTypeSchema = z.enum(ARMOR_TYPES);
export type ArmorType = z.infer<typeof armorTypeSchema>;

// Weapon Categories
export const WEAPON_CATEGORIES = ['simple', 'martial'] as const;
export const weaponCategorySchema = z.enum(WEAPON_CATEGORIES);
export type WeaponCategory = z.infer<typeof weaponCategorySchema>;

// Weapon Types
export const WEAPON_TYPES = ['melee', 'ranged'] as const;
export const weaponTypeSchema = z.enum(WEAPON_TYPES);
export type WeaponType = z.infer<typeof weaponTypeSchema>;

// Action Types for the 2024 action economy
export const ACTION_TYPES = ['action', 'bonus_action', 'reaction', 'free', 'movement', 'other'] as const;
export const actionTypeSchema = z.enum(ACTION_TYPES);
export type ActionType = z.infer<typeof actionTypeSchema>;

// Weapon Mastery Properties (2024 D&D feature)
export const WEAPON_MASTERY_PROPERTIES = ['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'] as const;
export const weaponMasteryPropertySchema = z.enum(WEAPON_MASTERY_PROPERTIES);
export const weaponMasteryProperty = weaponMasteryPropertySchema; // Alias for consistent naming
export type WeaponMasteryProperty = z.infer<typeof weaponMasteryPropertySchema>;

// D&D 5e 2024 Monster Spellcasting Schema (simplified format for 2024)
export const monsterSpellcastingSchema = z.object({
  ability: spellcastingAbilitySchema,
  spellSaveDC: z.number(),
  spellAttackBonus: z.number(),
  
  /** 2024 format for monster spellcasting */
  spells: z.object({
    /** At-will spells */
    atWill: z.array(z.string()).optional(),
    /** Daily spell usage: "1/day", "2/day", etc. */
    daily: z.record(z.string(), z.array(z.string())).optional(),
    /** Recharge spells */
    recharge: z.array(z.object({
      recharge: z.string(), // "5-6", "6"
      spells: z.array(z.string())
    })).optional()
  })
});

export type MonsterSpellcasting = z.infer<typeof monsterSpellcastingSchema>;

/**
 * Generic choice schema for player choices
 * Used when players need to choose between multiple options (tools, skills, spells, etc.)
 */
export const genericChoiceSchema = z.object({
  /** Number of choices the player can make */
  count: z.number().min(1),
  /** Array of options to choose from */
  options: z.array(z.object({
    /** Display name for the option */
    name: z.string(),
    /** Document reference (if applicable) */
    _ref: documentReferenceSchema.optional(),
    /** Additional metadata about this choice */
    metadata: z.record(z.unknown()).optional()
  })),
  /** Optional description of the choice (e.g., "Choose one kind of Gaming Set") */
  description: z.string().optional()
});

export type GenericChoice = z.infer<typeof genericChoiceSchema>;

/**
 * Type-safe document references for specific D&D concepts
 * These constrain the pluginType field to ensure type safety
 */
export const backgroundReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('background')
});

export const speciesReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('species') 
});

export const classReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('class')
});

export const spellReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('spell')
});

export const featReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('feat')
});

export const itemReferenceSchema = documentReferenceSchema.extend({
  documentType: z.literal('item')
});

export const conditionReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('condition')
});

export const actionReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('action')
});

export type BackgroundReference = z.infer<typeof backgroundReferenceSchema>;
export type SpeciesReference = z.infer<typeof speciesReferenceSchema>;
export type ClassReference = z.infer<typeof classReferenceSchema>;
export type SpellReference = z.infer<typeof spellReferenceSchema>;
export type FeatReference = z.infer<typeof featReferenceSchema>;
export type ItemReference = z.infer<typeof itemReferenceSchema>;
export type ConditionReference = z.infer<typeof conditionReferenceSchema>;
export type ActionReference = z.infer<typeof actionReferenceSchema>;

/**
 * D&D 5e 2024 Spell-specific schemas
 */

/**
 * Spell class availability schema for 2024 format
 * Tracks which classes can access spells and how
 */
export const spellClassAvailabilitySchema = z.object({
  /** Classes that get this spell on their spell list */
  classList: z.array(z.enum(['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'])),
  /** Whether this spell is domain/circle/etc. specific */
  subclassRestrictions: z.array(z.object({
    className: z.string(),
    subclassName: z.string(),
    source: z.string().optional()
  })).optional(),
  /** Alternative access methods (feats, magic items, etc.) */
  alternativeAccess: z.array(z.object({
    type: z.enum(['feat', 'magic_item', 'feature']),
    name: z.string(),
    source: z.string().optional()
  })).optional()
});

/**
 * Enhanced spell components schema for 2024
 */
export const spellComponentsSchema = z.object({
  /** Verbal component required */
  verbal: z.boolean(),
  /** Somatic component required */
  somatic: z.boolean(),
  /** Material component required */
  material: z.boolean(),
  /** Material component details */
  materialComponents: z.object({
    /** Description of material components */
    description: z.string(),
    /** Whether components are consumed */
    consumed: z.boolean().default(false),
    /** Gold piece cost if expensive */
    cost: z.number().optional(),
    /** Whether a focus can substitute */
    focusSubstitute: z.boolean().default(true)
  }).optional()
});

/**
 * Spell scaling schema for higher levels and character progression
 */
export const spellScalingSchema = z.object({
  /** How the spell scales when cast at higher levels */
  higherLevels: z.object({
    /** Description of scaling */
    description: z.string(),
    /** Specific scaling patterns */
    scaling: z.array(z.object({
      /** What aspect scales (damage, targets, duration, etc.) */
      type: z.enum(['damage', 'healing', 'targets', 'duration', 'range', 'area']),
      /** How much it scales per level */
      increment: z.string(), // e.g., "1d6", "1 target", "10 feet"
      /** At what spell level intervals */
      interval: z.number().default(1)
    }))
  }).optional(),
  /** Character level scaling (for cantrips mainly) */
  characterLevel: z.object({
    /** Description of character level scaling */
    description: z.string(),
    /** Scaling breakpoints */
    breakpoints: z.array(z.object({
      /** Character level */
      level: z.number(),
      /** What changes */
      effect: z.string()
    }))
  }).optional()
});

export type SpellClassAvailability = z.infer<typeof spellClassAvailabilitySchema>;
export type SpellComponents = z.infer<typeof spellComponentsSchema>;
export type SpellScaling = z.infer<typeof spellScalingSchema>;