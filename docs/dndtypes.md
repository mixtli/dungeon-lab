# D&D 5e 2024 Types Reference

This document outlines the ideal TypeScript type definitions for D&D 5e 2024 concepts based on an audit against the official System Reference Document (SRD) v5.2.1. Each type includes explanatory comments about field purposes and design decisions.

## Table of Contents

1. [Shared Types](#shared-types)
2. [Background Types](#background-types)
3. [Species Types](#species-types) 
4. [Feat Types](#feat-types)
5. [Spell Types](#spell-types)
6. [Character Class Types](#character-class-types)
7. [Item Types](#item-types)
8. [Monster/Stat Block Types](#monster-stat-block-types)
9. [Condition Types](#condition-types)
10. [Action Types](#action-types)
11. [Character Types](#character-types)

## Shared Types

These fundamental types are used throughout the D&D type system and are defined in `common.mts`.

### Constants and Union Types

Core D&D concepts that are referenced throughout the system:

```typescript
/**
 * D&D 5e 2024 Core Abilities
 */
export const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
export const abilitySchema = z.enum(ABILITIES);
export type Ability = z.infer<typeof abilitySchema>;

/**
 * D&D 5e 2024 Skills (18 total)
 */
export const SKILLS_2024 = [
  'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight of hand', 'stealth', 'survival'
] as const;
export const skillSchema = z.enum(SKILLS_2024);
export type Skill = z.infer<typeof skillSchema>;

/**
 * D&D 5e 2024 Damage Types
 */
export const DAMAGE_TYPES_2024 = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
] as const;
export const damageTypeSchema = z.enum(DAMAGE_TYPES_2024);
export type DamageType = z.infer<typeof damageTypeSchema>;

/**
 * D&D 5e 2024 Conditions
 */
export const CONDITIONS_2024 = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious'
] as const;
export const conditionSchema = z.enum(CONDITIONS_2024);
export type Condition = z.infer<typeof conditionSchema>;

/**
 * D&D 5e 2024 Languages
 */
export const LANGUAGES_2024 = [
  'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc', 
  'abyssal', 'celestial', 'deep speech', 'draconic', 'druidic', 'ignan', 'infernal', 
  'primordial', 'sylvan', 'terran', 'undercommon', 'telepathy'
] as const;
export const languageSchema = z.enum(LANGUAGES_2024);
export type Language = z.infer<typeof languageSchema>;

/**
 * D&D 5e 2024 Alignments
 */
export const ALIGNMENTS_2024 = [
  'lawful good', 'neutral good', 'chaotic good', 
  'lawful neutral', 'neutral', 'chaotic neutral', 
  'lawful evil', 'neutral evil', 'chaotic evil', 'unaligned'
] as const;
export const alignmentSchema = z.enum(ALIGNMENTS_2024);
export type Alignment = z.infer<typeof alignmentSchema>;

/**
 * Creature Sizes
 */
export const CREATURE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;
export const creatureSizeSchema = z.enum(CREATURE_SIZES);
export type CreatureSize = z.infer<typeof creatureSizeSchema>;

/**
 * Creature Types
 */
export const CREATURE_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental',
  'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze',
  'plant', 'undead'
] as const;
export const creatureTypeSchema = z.enum(CREATURE_TYPES);
export type CreatureType = z.infer<typeof creatureTypeSchema>;

/**
 * Schools of Magic
 */
export const SPELL_SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation'
] as const;
export const spellSchoolSchema = z.enum(SPELL_SCHOOLS);
export type SpellSchool = z.infer<typeof spellSchoolSchema>;

/**
 * Currency Types
 */
export const CURRENCY_TYPES = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export const currencyTypeSchema = z.enum(CURRENCY_TYPES);
export type Currency = z.infer<typeof currencyTypeSchema>;

/**
 * Rest Types for ability/resource recovery
 */
export const REST_TYPES = ['turn', 'round', 'short rest', 'long rest', 'day'] as const;
export const restTypeSchema = z.enum(REST_TYPES);
export type RestType = z.infer<typeof restTypeSchema>;

/**
 * Magic Item Rarities
 */
export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'] as const;
export const itemRaritySchema = z.enum(ITEM_RARITIES);
export type ItemRarity = z.infer<typeof itemRaritySchema>;

/**
 * Saving Throw Effects
 */
export const SAVE_EFFECTS = ['none', 'half', 'negates', 'other'] as const;
export const saveEffectSchema = z.enum(SAVE_EFFECTS);
export type SaveEffect = z.infer<typeof saveEffectSchema>;

/**
 * Spellcasting Abilities (shortened versions)
 */
export const SPELLCASTING_ABILITIES = ['int', 'wis', 'cha'] as const;
export const spellcastingAbilitySchema = z.enum(SPELLCASTING_ABILITIES);
export type SpellcastingAbility = z.infer<typeof spellcastingAbilitySchema>;

/**
 * Spellcasting Types
 */
export const SPELLCASTING_TYPES = ['full', 'half', 'third', 'pact', 'none'] as const;
export const spellcastingTypeSchema = z.enum(SPELLCASTING_TYPES);
export type SpellcastingType = z.infer<typeof spellcastingTypeSchema>;

/**
 * Spell Preparation Types
 */
export const SPELL_PREPARATION_TYPES = ['known', 'prepared', 'both'] as const;
export const spellPreparationSchema = z.enum(SPELL_PREPARATION_TYPES);
export type SpellPreparationType = z.infer<typeof spellPreparationSchema>;

/**
 * Physical Damage Types (subset of all damage types)
 */
export const PHYSICAL_DAMAGE_TYPES = ['slashing', 'piercing', 'bludgeoning'] as const;
export const physicalDamageTypeSchema = z.enum(PHYSICAL_DAMAGE_TYPES);
export type PhysicalDamageType = z.infer<typeof physicalDamageTypeSchema>;

/**
 * Equipment Categories
 */
export const EQUIPMENT_CATEGORIES = ['adventuring-gear', 'tool', 'container', 'consumable'] as const;
export const equipmentCategorySchema = z.enum(EQUIPMENT_CATEGORIES);
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;

/**
 * Roll Advantage/Disadvantage
 */
export const ROLL_MODIFIERS = ['advantage', 'disadvantage'] as const;
export const rollModifierSchema = z.enum(ROLL_MODIFIERS);
export type RollModifier = z.infer<typeof rollModifierSchema>;

/**
 * Duration Types
 */
export const DURATION_TYPES = ['instantaneous', 'until_end_of_turn', 'until_start_of_turn', 'time_based', 'until_removed'] as const;
export const durationTypeSchema = z.enum(DURATION_TYPES);
export type DurationType = z.infer<typeof durationTypeSchema>;

/**
 * Area of Effect Shapes
 */
export const AOE_SHAPES = ['sphere', 'cube', 'cylinder', 'cone', 'line'] as const;
export const aoeShapeSchema = z.enum(AOE_SHAPES);
export type AoeShape = z.infer<typeof aoeShapeSchema>;

/**
 * Armor Types for proficiency requirements
 */
export const ARMOR_TYPES = ['light', 'medium', 'heavy'] as const;
export const armorTypeSchema = z.enum(ARMOR_TYPES);
export type ArmorType = z.infer<typeof armorTypeSchema>;

/**
 * Weapon Categories
 */
export const WEAPON_CATEGORIES = ['simple', 'martial'] as const;
export const weaponCategorySchema = z.enum(WEAPON_CATEGORIES);
export type WeaponCategory = z.infer<typeof weaponCategorySchema>;

/**
 * Weapon Types
 */
export const WEAPON_TYPES = ['melee', 'ranged'] as const;
export const weaponTypeSchema = z.enum(WEAPON_TYPES);
export type WeaponType = z.infer<typeof weaponTypeSchema>;

/**
 * Action Types for the 2024 action economy
 */
export const ACTION_TYPES = ['action', 'bonus_action', 'reaction', 'free', 'movement'] as const;
export const actionTypeSchema = z.enum(ACTION_TYPES);
export type ActionType = z.infer<typeof actionTypeSchema>;
```

**Usage Throughout System:**
```typescript
// Instead of hardcoding strings, use the constants and types:

// ❌ Don't do this:
savingThrow: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])

// ✅ Do this:
savingThrow: abilitySchema

// ❌ Don't do this:
damage: { type: z.string() }

// ✅ Do this: 
damage: { type: damageTypeSchema }

// ❌ Don't do this:
function rollAbilityCheck(ability: string) { ... }

// ✅ Do this:
function rollAbilityCheck(ability: Ability) { ... }
```

**Benefits of Using Constants:**

1. **Type Safety**: Prevents typos and invalid values at compile time
   ```typescript
   // ❌ This compiles but is wrong:
   const skill = "athelitics"; // typo won't be caught
   
   // ✅ This gives a compile error:
   const skill: Skill = "athelitics"; // TypeScript error!
   ```

2. **Autocomplete**: IDEs can provide intelligent completion
   ```typescript
   // Typing "ability." shows all valid options
   const primaryAbility: Ability = "str" // autocomplete suggests all abilities
   ```

3. **Refactoring Safety**: Changes propagate throughout the system
   ```typescript
   // If we change the ability name, all usages update automatically
   export const ABILITIES = ['might', 'agility', ...] // hypothetical change
   ```

4. **Documentation**: Single source of truth for valid values
   ```typescript
   // Developers can check ABILITIES constant to see all valid options
   console.log(ABILITIES); // ['strength', 'dexterity', ...]
   ```

5. **Runtime Validation**: Zod schemas provide runtime type checking
   ```typescript
   const result = abilitySchema.safeParse("invalid"); // { success: false, error: ... }
   ```

### Document Reference Schema

All cross-document relationships use a consistent reference pattern:

```typescript
/**
 * Document reference schema from @shared/types/reference.mjs
 * Used for all cross-document relationships (spells, items, feats, etc.)
 */
export const documentReferenceSchema = z.object({
  /** The target document's slug (e.g., "leather-armor", "fireball") */
  slug: z.string().min(1).max(255),
  
  /** The target document's type (actor, item, vtt-document) */
  type: documentTypeSchema,
  
  /** The target document's plugin-specific subtype (e.g., "weapon", "spell", "armor") */
  pluginType: z.string().min(1).optional(),
  
  /** Source book/module identifier (e.g., "xphb", "xmm") */
  source: z.string().min(1).optional(),
  
  /** Additional metadata for the reference */
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Usage in documents:
export const referenceObjectSchema = z.object({
  _ref: documentReferenceSchema
});
```

**Usage Examples:**
```typescript
// Spell reference
{ _ref: { slug: "fireball", type: "vtt-document", pluginType: "spell", source: "xphb" }}

// Item reference  
{ _ref: { slug: "leather-armor", type: "item", pluginType: "armor", source: "xphb" }}

// Feat reference
{ _ref: { slug: "magic-initiate-cleric", type: "vtt-document", pluginType: "feat", source: "xphb" }}
```

### Generic Choice Schema

Player choices throughout the D&D system use a consistent pattern:

```typescript
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
  pluginType: z.literal('item')
});

export const conditionReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('condition')
});

export const actionReferenceSchema = documentReferenceSchema.extend({
  pluginType: z.literal('action')
});
```

**Usage Examples:**
```typescript
// Tool proficiency choice (Soldier background)
{
  count: 1,
  options: [
    { name: "Gaming Set (Dice)", _ref: { slug: "gaming-set-dice", type: "item" }},
    { name: "Gaming Set (Cards)", _ref: { slug: "gaming-set-cards", type: "item" }},
    { name: "Gaming Set (Chess)", _ref: { slug: "gaming-set-chess", type: "item" }}
  ],
  description: "Choose one kind of Gaming Set"
}

// Skill choice (Fighter class)
{
  count: 2,
  options: [
    { name: "Acrobatics" },
    { name: "Animal Handling" },
    { name: "Athletics" },
    { name: "History" }
  ],
  description: "Choose 2 skills from the Fighter skill list"
}

// Spell choice (Magic Initiate feat)
{
  count: 2,
  options: [
    { name: "Guidance", _ref: { slug: "guidance", type: "vtt-document", pluginType: "spell" }},
    { name: "Light", _ref: { slug: "light", type: "vtt-document", pluginType: "spell" }},
    { name: "Mending", _ref: { slug: "mending", type: "vtt-document", pluginType: "spell" }}
  ],
  description: "Choose 2 cantrips from the Cleric spell list"
}
```

**When to Use Choice vs Array:**
- **Use Array**: When the proficiencies/items are fixed (e.g., Criminal always gets Thieves' Tools)
- **Use Choice**: When the player selects from options (e.g., Soldier chooses one Gaming Set type)

## Background Types

**Key 2024 Changes:**
- Ability scores moved FROM species TO backgrounds
- Features replaced with Origin Feats
- Exactly 5 components: Ability Scores, Feat, Skill Proficiencies, Tool Proficiency, Equipment
- Tool proficiencies can be fixed OR player choices

```typescript
/**
 * D&D 5e 2024 Background Schema
 * Based on SRD structure: each background has exactly 5 components
 * Uses shared types: documentReferenceSchema and genericChoiceSchema
 */

/**
 * 2024 ability score system for backgrounds
 * Each background lists exactly 3 ability scores to choose from
 * Player increases one by 2 and another by 1, OR all three by 1
 * NOTE: This replaces the old racial ability score improvements
 */
export const abilityScoreChoiceSchema = z.object({
  /** The three ability scores this background offers */
  choices: z.array(abilitySchema).length(3),
  /** Human-readable description like "Intelligence, Wisdom, Charisma" */
  displayText: z.string()
});

/**
 * Equipment choice structure matching 2024 "Choose A or B" pattern
 * Every background offers choice between specific equipment or 50 GP
 */
export const backgroundEquipmentSchema = z.object({
  /** Option A: Specific equipment list */
  equipmentPackage: z.object({
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number().default(1),
      /** Reference to item document using shared schema */
      _ref: documentReferenceSchema.optional()
    })),
    /** Starting gold pieces included in package */
    goldPieces: z.number()
  }),
  /** Option B: Always exactly 50 GP in 2024 */
  goldAlternative: z.number().default(50),
  /** Currency type (always gold for backgrounds) */
  currency: currencyTypeSchema.default('gp')
});

/**
 * Tool proficiency schema with document references
 */
export const toolProficiencySchema = z.object({
  _ref: documentReferenceSchema,
  displayName: z.string()
});

/**
 * Complete D&D 2024 Background Schema
 * Matches SRD structure exactly
 */
export const dndBackgroundDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  
  /** 2024: Ability scores moved from species to backgrounds */
  abilityScores: abilityScoreChoiceSchema,
  
  /** 2024: Each background grants exactly one Origin Feat */
  originFeat: z.object({
    name: z.string(),
    /** Reference to feat document using shared schema */
    _ref: documentReferenceSchema.optional()
  }),
  
  /** 2024: Each background grants exactly 2 skill proficiencies */
  skillProficiencies: z.array(z.string()).length(2),
  
  /** 
   * 2024: Tool proficiencies - can be fixed list OR player choice
   * Fixed example: Thieves' Tools for Criminal
   * Choice example: "Choose one kind of Gaming Set" for Soldier
   */
  toolProficiencies: z.union([
    z.array(toolProficiencySchema), // Fixed proficiencies
    genericChoiceSchema // Choice between options
  ]).optional(),
  
  /** 2024: Equipment following "Choose A or B" pattern */
  equipment: backgroundEquipmentSchema,
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Available backgrounds in D&D 2024 (16 total)
 * NOTE: Expanded from 2014's 13 backgrounds
 */
export const backgroundIdentifiers = [
  'acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'farmer',
  'guard', 'hermit', 'merchant', 'noble', 'sage', 'sailor', 'scoundrel',
  'soldier', 'wayfarer', 'guide'
] as const;
```

**Field Notes:**
- `abilityScores`: Critical 2024 change - backgrounds now determine your ability score increases, not species
- `originFeat`: Replaces old "Features" - these are more mechanically useful than descriptive features
- Equipment structure follows strict SRD pattern where every background offers equipment package OR 50 GP

## Species Types

**Key 2024 Changes:**
- NO ability score improvements (moved to backgrounds)
- Called "species" not "races"  
- All species have consistent trait structure
- Size includes descriptive text like "Medium (about 5–7 feet tall)"

```typescript
/**
 * D&D 5e 2024 Species Schema
 * Major changes: no ability scores, consistent trait structure
 */

/**
 * Species trait with name and description
 * Every species ability is now a named trait
 */
export const speciesTraitSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Some traits have mechanical effects at higher levels */
  levelRequirement: z.number().optional(),
  /** Usage limitations for active traits */
  uses: z.object({
    value: z.number(),
    per: restTypeSchema
  }).optional()
});

/**
 * Ancestry system for species like Dragonborn
 * Allows for mechanical variations within a species
 */
export const ancestrySchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Affects specific traits like breath weapon */
  affectedTraits: z.array(z.string()),
  /** Additional traits granted by this ancestry */
  bonusTraits: z.array(speciesTraitSchema).optional()
});

/**
 * Complete D&D 2024 Species Schema
 */
export const dndSpeciesDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** 2024: Always includes creature type (e.g., "Humanoid") */
  creatureType: z.string(),
  
  /** 2024: Size with descriptive text like "Medium (about 5–7 feet tall)" */
  size: z.object({
    category: creatureSizeSchema,
    description: z.string() // e.g., "about 5–7 feet tall"
  }),
  
  /** 2024: Base walking speed (most species now have 30 feet) */
  speed: z.number().default(30),
  
  /** All species abilities as named traits */
  traits: z.array(speciesTraitSchema),
  
  /** For species with ancestry options (Dragonborn, etc.) */
  ancestryOptions: z.array(ancestrySchema).optional(),
  
  /** 2024: Life span information */
  lifespan: z.object({
    maturity: z.number(), // Age of physical maturity
    average: z.number(),  // Average lifespan
    maximum: z.number().optional() // Maximum known lifespan
  }).optional(),
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D 2024 Species (10 in core PHB)
 * NOTE: Half-Elf and Half-Orc removed, replaced with mix-and-match rules
 */
export const speciesIdentifiers = [
  'aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath',
  'halfling', 'human', 'orc', 'tiefling'
] as const;
```

**Field Notes:**
- `creatureType`: New mandatory field in 2024 (was sometimes implicit before)
- `size.description`: SRD always includes descriptive text, not just category
- `ancestryOptions`: Models Dragonborn draconic ancestry, Tiefling fiendish legacy, etc.
- NO `abilityScoreImprovements`: This was moved to backgrounds in 2024

## Feat Types

**Key 2024 Changes:**
- Four distinct feat categories with different rules
- Origin Feats granted by backgrounds at level 1
- All General Feats now provide +1 ability score improvement
- Epic Boon Feats can increase ability scores above 20

```typescript
/**
 * D&D 5e 2024 Feat System
 * Complete restructure with 4 distinct feat categories
 */

/**
 * Base feat schema shared by all feat types
 */
const baseFeatSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Origin Feats - granted by backgrounds at level 1
 * No prerequisites, no ability score improvements
 */
export const originFeatSchema = baseFeatSchema.extend({
  category: z.literal('origin'),
  /** Origin feats have no prerequisites */
  prerequisites: z.never().optional(),
  /** Origin feats don't grant ability score improvements */
  abilityScoreImprovement: z.never().optional(),
  /** Which background grants this feat */
  grantedBy: z.string()
});

/**
 * General Feats - available starting at level 4
 * All provide +1 to an ability score AND a special benefit
 */
export const generalFeatSchema = baseFeatSchema.extend({
  category: z.literal('general'),
  
  /** Prerequisites for taking this feat */
  prerequisites: z.object({
    level: z.number().min(4), // General feats require level 4+
    ability: z.record(abilitySchema, z.number()).optional(), // e.g., {"strength": 13}
    proficiency: z.array(z.string()).optional(),
    other: z.string().optional()
  }),
  
  /** 2024: ALL General Feats provide +1 to an ability score */
  abilityScoreImprovement: z.object({
    /** Which ability scores can be improved (player chooses) */
    choices: z.array(abilitySchema),
    /** Always +1 for General Feats */
    value: z.literal(1)
  }),
  
  /** Whether this feat can be taken multiple times */
  repeatable: z.boolean().default(false)
});

/**
 * Fighting Style Feats - granted by class features
 * Only available to classes with Fighting Style feature
 */
export const fightingStyleFeatSchema = baseFeatSchema.extend({
  category: z.literal('fighting_style'),
  /** Must have Fighting Style class feature */
  prerequisites: z.object({
    classFeature: z.literal('Fighting Style')
  })
});

/**
 * Epic Boon Feats - available at level 19+
 * Can increase ability scores above 20 (up to 30)
 */
export const epicBoonFeatSchema = baseFeatSchema.extend({
  category: z.literal('epic_boon'),
  prerequisites: z.object({
    level: z.literal(19) // Epic Boons require level 19+
  }),
  /** Epic Boons can increase ability scores to 30 */
  abilityScoreImprovement: z.object({
    choices: z.array(abilitySchema),
    value: z.number(),
    /** Can exceed normal 20 limit */
    canExceedTwenty: z.boolean().default(true)
  }).optional()
});

/**
 * Discriminated union of all feat types
 * Ensures type safety while allowing different schemas
 */
export const dndFeatDataSchema = z.discriminatedUnion('category', [
  originFeatSchema,
  generalFeatSchema,
  fightingStyleFeatSchema,
  epicBoonFeatSchema
]);
```

**Field Notes:**
- `category`: Critical for determining which rules apply to the feat
- `abilityScoreImprovement`: All General Feats now include this (major 2024 change)
- `prerequisites.level`: Different minimum levels for different feat categories
- `repeatable`: Some General Feats can be taken multiple times with stacking benefits

## Spell Types

**Key 2024 Changes:**
- Class availability clearly indicated in spell format
- Better distinction between cantrip scaling and higher-level casting
- Enhanced component structure
- Ritual casting clearly marked

```typescript
/**
 * D&D 5e 2024 Spell Schema
 * Enhanced to match SRD format exactly
 */

/**
 * Spell components with detailed breakdown
 * Matches SRD component notation exactly
 */
export const spellComponentsSchema = z.object({
  /** Verbal component required */
  verbal: z.boolean(),
  /** Somatic component required */
  somatic: z.boolean(),
  /** Material component required */
  material: z.boolean(),
  /** Specific material components (if any) */
  materialDescription: z.string().optional(),
  /** Whether material components are consumed */
  materialConsumed: z.boolean().optional(),
  /** Gold piece cost for expensive material components */
  materialCost: z.number().optional()
});

/**
 * Class availability in SRD format
 * Example: "Level 2 Evocation (Bard, Cleric, Druid, Paladin, Ranger)"
 */
export const spellClassAvailabilitySchema = z.object({
  /** Classes that can learn/prepare this spell */
  classes: z.array(z.string()),
  /** Alternative sources (subclasses, feats, etc.) */
  alternativeSources: z.array(z.string()).optional()
});

/**
 * Spell scaling for higher levels
 * Distinguishes between cantrip scaling and spell slot scaling
 */
export const spellScalingSchema = z.object({
  /** For cantrips: damage increases at character levels 5, 11, 17 */
  cantripScaling: z.object({
    type: z.literal('cantrip'),
    scalePoints: z.array(z.object({
      level: z.number(),
      effect: z.string()
    }))
  }).optional(),
  
  /** For leveled spells: effects when cast at higher spell slots */
  higherLevelScaling: z.object({
    type: z.literal('spell_slot'),
    effect: z.string() // e.g., "The damage increases by 1d4 for each spell slot level above 2"
  }).optional()
});

/**
 * Complete D&D 2024 Spell Schema
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
  
  /** Whether spell requires an attack roll */
  attackRoll: z.boolean().default(false),
  
  // Source information  
  source: z.string().optional(),
  page: z.number().optional()
});
```

**Field Notes:**
- `classAvailability`: Matches SRD format like "Level 2 Evocation (Wizard)"
- `scaling.cantripScaling` vs `scaling.higherLevelScaling`: Important distinction in 2024
- `components.materialCost`: For spells with expensive material components
- `ritual`: Clearly indicates if spell can be cast as ritual (taking extra time, no spell slot)

## Character Class Types

**Key 2024 Changes:**
- Weapon Mastery system integration
- Exactly 4 subclasses per class in core PHB
- New class features like improved Channel Divinity
- Fighting Style Feats integration

```typescript
/**
 * D&D 5e 2024 Character Class Schema
 * Updated for new 2024 features and structure
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
 * D&D 2024 Classes (12 total, same as 2014)
 */
export const characterClassIdentifiers = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'
] as const;
```

**Field Notes:**
- `weaponMastery`: New 2024 system for Fighter, Barbarian, Paladin, Ranger
- `subclasses`: Enforced array length of 4 matches 2024 PHB structure
- `hitDie`: Store as number (8 for d8) rather than string for easier calculations
- `spellcasting.preparation`: Distinguishes between classes that know spells vs prepare them

## Item Types

**Key 2024 Changes:**
- Weapon Mastery properties integrated
- Enhanced weapon and armor property systems
- Clearer magical item structures

```typescript
/**
 * D&D 5e 2024 Item Types
 * Enhanced for new weapon mastery and property systems
 */

/**
 * 2024 Weapon Mastery Properties
 * New system providing additional effects when weapon is mastered
 */
export const weaponMasteryProperty = z.enum([
  'cleave',    // Hit additional target
  'graze',     // Damage on miss
  'nick',      // Extra attack with light weapons
  'push',      // Force movement
  'sap',       // Disadvantage on next attack
  'slow',      // Reduce speed
  'topple',    // Knock prone
  'vex'        // Advantage on next attack
]);

/**
 * Enhanced weapon schema with 2024 mastery properties
 */
export const weaponSchema = z.object({
  itemType: z.literal('weapon'),
  name: z.string(),
  description: z.string(),
  
  /** Basic weapon properties */
  damage: z.object({
    dice: z.string(), // e.g., "1d8"
    type: physicalDamageTypeSchema
  }),
  
  /** Weapon classification */
  category: weaponCategorySchema,
  type: weaponTypeSchema,
  
  /** Traditional weapon properties */
  properties: z.array(z.enum([
    'ammunition', 'finesse', 'heavy', 'light', 'loading',
    'range', 'reach', 'special', 'thrown', 'two-handed', 'versatile'
  ])).optional(),
  
  /** 2024: Weapon Mastery properties */
  mastery: weaponMasteryProperty.optional(),
  
  /** Versatile damage (for versatile weapons) */
  versatileDamage: z.object({
    dice: z.string() // e.g., "1d10"
  }).optional(),
  
  /** Range information (for ranged/thrown weapons) */
  range: z.object({
    normal: z.number(),
    long: z.number()
  }).optional(),
  
  /** Weight and cost */
  weight: z.number().optional(),
  cost: z.object({
    amount: z.number(),
    currency: currencyTypeSchema.default('gp')
  }).optional(),
  
  /** Magic weapon properties */
  magical: z.boolean().default(false),
  enchantmentBonus: z.number().optional(), // +1, +2, +3
  rarity: itemRaritySchema.optional(),
  attunement: z.boolean().default(false),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Enhanced armor schema
 */
export const armorSchema = z.object({
  itemType: z.literal('armor'),
  name: z.string(),
  description: z.string(),
  
  /** Armor Class provided */
  armorClass: z.number(),
  
  /** Armor type determines proficiency requirement */
  type: armorTypeSchema,
  
  /** Dex modifier limitations */
  maxDexBonus: z.number().optional(),
  
  /** Strength requirement (heavy armor) */
  strengthRequirement: z.number().optional(),
  
  /** Stealth disadvantage */
  stealthDisadvantage: z.boolean().default(false),
  
  /** Time to don/doff */
  donTime: z.string().optional(),
  doffTime: z.string().optional(),
  
  /** Weight and cost */
  weight: z.number().optional(),
  cost: z.object({
    amount: z.number(),
    currency: currencyTypeSchema.default('gp')
  }).optional(),
  
  /** Magic armor properties */
  magical: z.boolean().default(false),
  enchantmentBonus: z.number().optional(),
  rarity: itemRaritySchema.optional(),
  attunement: z.boolean().default(false),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * General equipment/gear schema
 */
export const gearSchema = z.object({
  itemType: z.literal('gear'),
  name: z.string(),
  description: z.string(),
  
  /** Gear category */
  category: equipmentCategorySchema,
  
  /** Container capacity (if applicable) */
  capacity: z.object({
    weight: z.number(),
    volume: z.string()
  }).optional(),
  
  /** Uses for consumables */
  uses: z.number().optional(),
  
  /** Weight and cost */
  weight: z.number().optional(),
  cost: z.object({
    amount: z.number(),
    currency: currencyTypeSchema.default('gp')
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Discriminated union for all item types
 */
export const dndItemDataSchema = z.discriminatedUnion('itemType', [
  weaponSchema,
  armorSchema,
  gearSchema
]);
```

**Field Notes:**
- `mastery`: New 2024 weapon property that provides special effects when mastered
- `enchantmentBonus`: Separated from magical to distinguish +1/+2/+3 bonuses from other magic properties
- `itemType`: Discriminated union ensures type safety across different item categories

## Monster/Stat Block Types

**Status:** ✅ **Current implementation is already well-structured and aligns with SRD**

The existing stat block types are comprehensive and accurate. Minor suggestions:

```typescript
/**
 * Current stat block implementation is solid, minor enhancements:
 */

// Add 2024 habitat and treasure theme support (already present)
export const habitatSchema = z.enum([
  'arctic', 'coastal', 'desert', 'forest', 'grassland', 'hill',
  'mountain', 'swamp', 'underdark', 'underwater', 'urban'
]);

export const treasureThemeSchema = z.enum([
  'arcane', 'armaments', 'artistic', 'bygone', 'culinary', 'draconic',
  'ephemeral', 'folkloric', 'haunted', 'infernal', 'primeval', 'princely'
]);

// Ensure spellcasting follows 2024 format
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
```

## Condition Types

**Key 2024 Updates:**
- Verify condition list matches 2024 exactly
- Enhanced mechanical descriptions

```typescript
/**
 * D&D 5e 2024 Condition Schema
 * Updated condition list and enhanced mechanical descriptions
 */

export const dndConditionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** Mechanical effects of the condition */
  effects: z.object({
    /** Movement restrictions */
    movement: z.object({
      prevented: z.boolean().default(false),
      reduced: z.boolean().default(false),
      speedReduction: z.number().optional()
    }).optional(),
    
    /** Action restrictions */
    actions: z.object({
      prevented: z.boolean().default(false),
      disadvantage: z.boolean().default(false)
    }).optional(),
    
    /** Attack roll modifications */
    attackRolls: z.object({
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional(),
      prevented: z.boolean().default(false)
    }).optional(),
    
    /** Saving throw modifications */
    savingThrows: z.object({
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional(),
      specific: z.record(z.string(), rollModifierSchema).optional()
    }).optional(),
    
    /** How others interact with affected creature */
    againstAffected: z.object({
      attackAdvantage: z.boolean().optional(),
      attackDisadvantage: z.boolean().optional()
    }).optional()
  }),
  
  /** Duration information */
  duration: z.object({
    type: durationTypeSchema,
    specific: z.string().optional() // e.g., "1 minute", "24 hours"
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D 2024 Conditions (verify against SRD)
 */
export const conditionIdentifiers = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious'
] as const;
```

## Action Types

**Key 2024 Updates:**
- Updated action economy
- Enhanced action categorization

```typescript
/**
 * D&D 5e 2024 Action Schema
 * Updated for 2024 action economy
 */

export const dndActionDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** Action type in 2024 economy */
  actionType: actionTypeSchema,
  
  /** Specific timing for reactions */
  trigger: z.string().optional(), // e.g., "when you take damage"
  
  /** Action requirements */
  requirements: z.object({
    /** Minimum level */
    level: z.number().optional(),
    /** Required class features */
    features: z.array(z.string()).optional(),
    /** Required equipment */
    equipment: z.array(z.string()).optional()
  }).optional(),
  
  /** Mechanical effects */
  effects: z.object({
    /** Range of effect */
    range: z.string().optional(), // e.g., "5 feet", "30 feet"
    
    /** Area of effect */
    area: z.object({
      type: aoeShapeSchema,
      size: z.number()
    }).optional(),
    
    /** Attack roll required */
    attackRoll: z.boolean().default(false),
    
    /** Saving throw required */
    savingThrow: z.object({
      ability: abilitySchema,
      dc: z.number().optional() // May be calculated
    }).optional(),
    
    /** Damage dealt */
    damage: z.object({
      dice: z.string(),
      type: z.string()
    }).optional()
  }).optional(),
  
  /** Usage limitations */
  uses: z.object({
    value: z.number(),
    per: restTypeSchema
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Basic D&D actions available to all characters
 */
export const basicActionIdentifiers = [
  'attack', 'cast-spell', 'dash', 'disengage', 'dodge', 'help',
  'hide', 'ready', 'search', 'use-object', 'grapple', 'shove'
] as const;
```

## Implementation Notes

### Migration Strategy
1. **Phase 1**: Update Background and Species types (highest impact)
2. **Phase 2**: Implement new Feat system 
3. **Phase 3**: Enhance Spell and Class types
4. **Phase 4**: Polish Item, Condition, and Action types
5. **Phase 5**: Migrate other choice patterns to use `genericChoiceSchema`

### Backward Compatibility
- Consider versioning schemas to support both 2014 and 2024 data
- Provide migration utilities for existing data
- Document breaking changes clearly
- Tool proficiency changes require data migration from string arrays to union type

### Validation Strategy
- Create comprehensive test suites using actual SRD examples
- Validate against real D&D Beyond data where possible
- Ensure all 2024 PHB content can be properly represented
- Test both fixed and choice-based proficiency patterns

## Character Types

A D&D 2024 character represents the complete player character sheet with all mechanical elements properly integrated. Our current implementation has significant gaps compared to the 2024 rules.

### Current Implementation Gaps

Our existing character schema (`character.mts`) treats many core elements as generic records or strings:
- Species: `race: z.string().optional()` (should use document reference)
- Background: `background: z.string().optional()` (should use document reference) 
- Class: `originalClass: z.string().optional()` (should support multiclassing with references)
- Spells: `spells: z.record(z.unknown())` (needs proper spell tracking)
- Equipment: Missing structured inventory system

The character schema should store the final resolved state (what the character *has*) rather than tracking how choices were made during character creation.

### Complete D&D 2024 Character Schema

```typescript
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
    walk: z.number().min(0).default(30),
    fly: z.number().min(0).default(0),
    swim: z.number().min(0).default(0),
    climb: z.number().min(0).default(0),
    burrow: z.number().min(0).default(0),
    hover: z.boolean().default(false)
  }),
  
  /** Death saves */
  deathSaves: z.object({
    successes: z.number().min(0).max(3).default(0),
    failures: z.number().min(0).max(3).default(0)
  }),
  
  /** Condition tracking */
  conditions: z.array(z.object({
    condition: conditionReferenceSchema,
    source: z.string().optional(),
    duration: z.string().optional()
  })).default([]),
  
  /** Exhaustion level */
  exhaustion: z.number().min(0).max(6).default(0),
  
  /** Inspiration */
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
    _ref: actionReferenceSchema,
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
export const dndCharacterSchema = z.object({
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

export type DndCharacter = z.infer<typeof dndCharacterSchema>;
```

### Key Improvements Over Current Implementation

1. **Full 2024 Integration**: Uses all our audited schemas (species, background, class, spell, feat)
2. **Proper Multiclassing**: Tracks levels per class with spell slot calculations
3. **Complete Spellcasting**: Distinguishes known vs prepared, tracks spell slots properly
4. **Weapon Mastery**: 2024 feature for tracking weapon masteries
5. **Structured Inventory**: Proper equipment slots and magical item attunement
6. **Feature Tracking**: Class features, feats, and species traits with usage tracking
7. **Clean References**: Simple document references without choice tracking metadata
8. **Type Safety**: Full TypeScript integration with typed document references that enforce correct pluginType values

This schema captures the complete 2024 D&D character sheet while integrating with all the other type definitions in our system.

This document provides the foundation for implementing accurate D&D 5e 2024 types that properly represent all concepts from the official rules while maintaining clean, type-safe TypeScript interfaces with consistent choice patterns and document references.