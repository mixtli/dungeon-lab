import { z } from 'zod';
import { monsterSpellcastingSchema, abilitySchema, skillSchema, damageTypeSchema, creatureSizeSchema } from './common.mjs';

/**
 * D&D 5e 2024 Stat Block Runtime Types
 * 
 * Complete stat block schema that covers all fields needed for all creatures (monsters and NPCs).
 * In 2024 D&D, monsters and NPCs use identical stat block formats.
 * All document references use MongoDB 'id' fields.
 */

// Import creature types from common.mjs for consistency
// Note: CREATURE_TYPES is available from common.mjs if needed

// Senses structure for 2024
export const sensesSchema = z.object({
  blindsight: z.number().optional(),
  darkvision: z.number().optional(),
  tremorsense: z.number().optional(),
  truesight: z.number().optional(),
  passivePerception: z.number(),
  other: z.array(z.string()).optional()
}).optional();

// Speed structure for 2024
export const speedSchema = z.object({
  walk: z.number().optional(),
  fly: z.number().optional(),
  swim: z.number().optional(),
  climb: z.number().optional(),
  burrow: z.number().optional(),
  hover: z.boolean().optional() // For fly speed
});

// Armor Class structure for 2024
export const armorClassSchema = z.object({
  value: z.number(),
  source: z.string().optional(), // "Natural Armor", "Leather Armor", etc.
  notes: z.string().optional()
});

// Hit Points structure for 2024
export const hitPointsSchema = z.object({
  average: z.number(),
  current: z.number(),
  formula: z.string().optional()
});

// Ability scores structure
export const abilitiesSchema = z.object({
  strength: z.number().min(1).max(30),
  dexterity: z.number().min(1).max(30),
  constitution: z.number().min(1).max(30),
  intelligence: z.number().min(1).max(30),
  wisdom: z.number().min(1).max(30),
  charisma: z.number().min(1).max(30)
});

// Saving throws structure
export const savingThrowsSchema = z.object({
  strength: z.number().optional(),
  dexterity: z.number().optional(),
  constitution: z.number().optional(),
  intelligence: z.number().optional(),
  wisdom: z.number().optional(),
  charisma: z.number().optional()
}).optional();

// Additional damage structure for multi-damage attacks
export const additionalDamageSchema = z.object({
  damage: z.string(), // Damage formula like "2d10"
  type: damageTypeSchema,
  average: z.number().optional()
});

// Area of effect structure
export const areaOfEffectSchema = z.object({
  shape: z.enum(['cone', 'line', 'sphere', 'cube', 'emanation', 'cylinder']),
  size: z.string() // "60-foot", "30-foot-long, 5-foot-wide", etc.
});

// Range structure for attacks
export const rangeSchema = z.object({
  normal: z.number(),
  long: z.number().optional() // Long range for disadvantage
});

// Action/Feature structure for 2024
export const actionSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  // Basic attack properties
  attackBonus: z.number().optional(),
  damage: z.string().optional(),
  damageType: damageTypeSchema.optional(),
  
  // Enhanced attack properties from 5etools markup
  attackType: z.enum(['melee', 'ranged', 'both']).optional(),
  reach: z.number().optional(), // Melee reach in feet
  range: rangeSchema.optional(), // Ranged attack ranges
  averageDamage: z.number().optional(), // From {@h}14 markup
  additionalDamage: z.array(additionalDamageSchema).optional(), // Multiple damage instances
  effectsOnMiss: z.string().optional(), // For {@hom} hit-or-miss effects
  
  // Save-based abilities
  savingThrow: z.object({
    ability: abilitySchema,
    dc: z.number()
  }).optional(),
  areaOfEffect: areaOfEffectSchema.optional(),
  
  // Recharge and usage
  recharge: z.string().optional(), // "5-6", "6", etc.
  uses: z.object({
    value: z.number(),
    per: z.enum(['turn', 'round', 'short rest', 'long rest', 'day'])
  }).optional(),
  
  // Conditions and references
  conditionsImposed: z.array(z.string()).optional(),
  references: z.array(z.any()).optional() // Reference objects
});

// Trait/Feature structure  
export const traitSchema = z.object({
  name: z.string(),
  description: z.string(),
  references: z.array(z.any()).optional() // Reference objects
});

// Legendary actions structure
export const legendaryActionSchema = z.object({
  name: z.string(),
  description: z.string(),
  cost: z.number().optional() // Cost in legendary actions (default 1)
});

// Habitat types for 2024
export const HABITATS = [
  'arctic', 'coastal', 'desert', 'forest', 'grassland', 'hill',
  'mountain', 'swamp', 'underdark', 'underwater', 'urban'
] as const;
export const habitatSchema = z.enum(HABITATS);
export type Habitat = z.infer<typeof habitatSchema>;

// Treasure themes for 2024
export const TREASURE_THEMES = [
  'arcane', 'armaments', 'artistic', 'bygone', 'culinary', 'draconic',
  'ephemeral', 'folkloric', 'haunted', 'infernal', 'primeval', 'princely'
] as const;
export const treasureThemeSchema = z.enum(TREASURE_THEMES);
export type TreasureTheme = z.infer<typeof treasureThemeSchema>;

/**
 * Complete D&D 5e 2024 stat block schema
 * Covers all fields needed for all creatures (monsters and NPCs use identical formats)
 */
export const dndStatBlockSchema = z.object({
  // Basic Information
  name: z.string(),
  size: creatureSizeSchema,
  type: z.string(), // Allows for subtypes like "humanoid (elf, wizard)"
  alignment: z.string(), // Flexible string to handle complex alignments
  
  // Core Stats
  armorClass: armorClassSchema,
  hitPoints: hitPointsSchema,
  speed: speedSchema,
  abilities: abilitiesSchema,
  
  // Combat & Skills
  proficiencyBonus: z.number(),
  savingThrows: savingThrowsSchema,
  skills: z.record(skillSchema, z.number()).optional(),
  initiativeModifier: z.number().optional(), // Separate from DEX for 2024
  
  // Resistances & Immunities
  damageVulnerabilities: z.array(damageTypeSchema).optional(),
  damageResistances: z.array(damageTypeSchema).optional(),
  damageImmunities: z.array(damageTypeSchema).optional(),
  conditionImmunities: z.array(z.any()).optional(), // Reference objects
  
  // Senses & Communication
  senses: sensesSchema,
  languages: z.array(z.string()).optional(),
  
  // Challenge & Experience
  challengeRating: z.union([z.number(), z.string()]), // Handles "1/4", "1/2", etc.
  experiencePoints: z.number().optional(),
  
  // Features & Actions
  traits: z.array(traitSchema).optional(),
  actions: z.array(actionSchema).optional(),
  bonusActions: z.array(actionSchema).optional(),
  reactions: z.array(actionSchema).optional(),
  
  // Legendary Abilities
  legendaryActions: z.array(legendaryActionSchema).optional(),
  legendaryActionCount: z.number().optional(), // Usually 3
  legendaryResistance: z.number().optional(), // Uses per day
  
  // Spellcasting (2024 monster format)
  spellcasting: monsterSpellcastingSchema.optional(),
  
  // 2024 New Fields
  habitat: z.array(habitatSchema).optional(),
  treasure: z.array(treasureThemeSchema).optional(),
  
  // Equipment/Gear (flexible for both monsters and NPCs)
  equipment: z.array(z.any()).optional(), // Reference objects
  
  // Source Information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Runtime type exports
 */
export type DndStatBlock = z.infer<typeof dndStatBlockSchema>;