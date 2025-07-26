import { z } from 'zod';
import { spellcastingSchema } from './common.mjs';
import { ReferenceObject } from '@dungeon-lab/shared/types/index.mjs';

// D&D 5e 2024 sizes
export const CREATURE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;
export const creatureSizeSchema = z.enum(CREATURE_SIZES);
export type CreatureSize = z.infer<typeof creatureSizeSchema>;

// D&D 5e 2024 creature types
export const CREATURE_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 
  'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 
  'plant', 'undead'
] as const;
export const creatureTypeSchema = z.enum(CREATURE_TYPES);
export type CreatureType = z.infer<typeof creatureTypeSchema>;

// D&D 5e 2024 alignments (simplified)
export const ALIGNMENTS_2024 = [
  'lawful good', 'neutral good', 'chaotic good',
  'lawful neutral', 'neutral', 'chaotic neutral', 
  'lawful evil', 'neutral evil', 'chaotic evil',
  'unaligned'
] as const;
export const alignment2024Schema = z.enum(ALIGNMENTS_2024);
export type Alignment2024 = z.infer<typeof alignment2024Schema>;

// Damage types for 2024
export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
] as const;
export const damageTypeSchema = z.enum(DAMAGE_TYPES);
export type DamageType = z.infer<typeof damageTypeSchema>;

// Skills for 2024 (updated list)
export const SKILLS_2024 = [
  'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight of hand', 'stealth', 'survival'
] as const;
export const skill2024Schema = z.enum(SKILLS_2024);
export type Skill2024 = z.infer<typeof skill2024Schema>;

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
  formula: z.string().optional(),
  current: z.number().optional()
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

// Action/Feature structure for 2024
export const actionSchema = z.object({
  name: z.string(),
  description: z.string(),
  attackBonus: z.number().optional(),
  damage: z.string().optional(),
  damageType: damageTypeSchema.optional(),
  savingThrow: z.object({
    ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
    dc: z.number()
  }).optional(),
  recharge: z.string().optional(), // "5-6", "6", etc.
  uses: z.object({
    value: z.number(),
    per: z.enum(['turn', 'round', 'short rest', 'long rest', 'day'])
  }).optional(),
  references: z.array(z.custom<ReferenceObject>()).optional()
});

// Trait/Feature structure  
export const traitSchema = z.object({
  name: z.string(),
  description: z.string(),
  references: z.array(z.custom<ReferenceObject>()).optional()
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
 * Covers all fields needed for both monsters and NPCs
 */
export const statBlockSchema = z.object({
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
  skills: z.record(skill2024Schema, z.number()).optional(),
  initiativeModifier: z.number().optional(), // Separate from DEX for 2024
  
  // Resistances & Immunities
  damageVulnerabilities: z.array(damageTypeSchema).optional(),
  damageResistances: z.array(damageTypeSchema).optional(),
  damageImmunities: z.array(damageTypeSchema).optional(),
  conditionImmunities: z.array(z.custom<ReferenceObject>()).optional(),
  
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
  
  // Spellcasting
  spellcasting: spellcastingSchema,
  
  // 2024 New Fields
  habitat: z.array(habitatSchema).optional(),
  treasure: z.array(treasureThemeSchema).optional(),
  
  // Equipment/Gear (flexible for both monsters and NPCs)
  equipment: z.array(z.custom<ReferenceObject>()).optional(),
  
  // Source Information
  source: z.string().optional(),
  page: z.number().optional()
});

export type IStatBlock = z.infer<typeof statBlockSchema>;

// Utility schemas for creating/updating stat blocks
export const createStatBlockSchema = statBlockSchema.partial({
  proficiencyBonus: true,
  experiencePoints: true,
  senses: true
});

export const updateStatBlockSchema = statBlockSchema.partial();

export type IStatBlockCreateData = z.infer<typeof createStatBlockSchema>;
export type IStatBlockUpdateData = z.infer<typeof updateStatBlockSchema>;