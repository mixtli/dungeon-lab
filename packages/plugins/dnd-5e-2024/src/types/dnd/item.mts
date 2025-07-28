import { z } from 'zod';

/**
 * D&D 5e Item Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 * 
 * Uses discriminated union approach for type-safe item categories.
 */

/**
 * Base schema shared by all item types
 */
const baseItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  /** Physical properties */
  weight: z.number().optional(),
  cost: z.object({
    amount: z.number(),
    currency: z.enum(['cp', 'sp', 'gp', 'pp']).default('gp')
  }).optional(),
  
  /** Magic properties */
  rarity: z.enum(['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact']).optional(),
  magical: z.boolean().optional(),
  attunement: z.boolean().optional(),
  attunementRequirements: z.string().optional(),
  
  /** Charges and usage for magic items */
  charges: z.number().optional(),
  rechargeable: z.boolean().optional(),
  rechargeRate: z.string().optional(),
  
  /** Tags for organization */
  tags: z.array(z.string()).optional()
});

/**
 * Weapon item schema with weapon-specific properties
 */
const weaponSchema = baseItemSchema.extend({
  itemType: z.literal('weapon'),
  
  /** Damage properties */
  damage: z.object({
    dice: z.string(),        // "1d8", "2d6", etc.
    type: z.enum(['slashing', 'piercing', 'bludgeoning', 'acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'])
  }),
  
  /** Versatile weapons have a second damage value */
  versatileDamage: z.object({
    dice: z.string(),        // "1d10" for versatile weapons
    type: z.enum(['slashing', 'piercing', 'bludgeoning', 'acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'])
  }).optional(),
  
  /** Weapon classification */
  weaponCategory: z.enum(['simple', 'martial']),
  weaponType: z.enum(['melee', 'ranged']),
  
  /** Weapon properties from D&D rules */
  properties: z.array(z.enum([
    'ammunition', 'finesse', 'heavy', 'light', 'loading', 
    'range', 'reach', 'special', 'thrown', 'two-handed', 'versatile'
  ])).optional(),
  
  /** 2024 D&D weapon mastery properties */
  mastery: z.array(z.enum([
    'cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'
  ])).optional(),
  
  /** Range for ranged weapons and thrown weapons */
  range: z.object({
    normal: z.number(),      // Normal range in feet
    long: z.number()         // Long range in feet
  }).optional(),
  
  /** Magic weapon bonuses */
  attackBonus: z.number().optional(),
  damageBonus: z.number().optional()
});

/**
 * Armor item schema with armor-specific properties
 */
const armorSchema = baseItemSchema.extend({
  itemType: z.literal('armor'),
  
  /** Armor class value */
  armorClass: z.number(),
  
  /** Armor type determines proficiency requirements */
  armorType: z.enum(['light', 'medium', 'heavy']),
  
  /** Dexterity modifier cap for medium/heavy armor */
  maxDexBonus: z.number().optional(),
  
  /** Strength requirement for heavy armor */
  strengthRequirement: z.number().optional(),
  
  /** Stealth disadvantage */
  stealthDisadvantage: z.boolean().optional(),
  
  /** Time to don/doff armor */
  donTime: z.string().optional(),      // "1 minute", "5 minutes", etc.
  doffTime: z.string().optional()
});

/**
 * Shield item schema
 */
const shieldSchema = baseItemSchema.extend({
  itemType: z.literal('shield'),
  
  /** AC bonus provided by shield */
  armorClassBonus: z.number().default(2),
  
  /** Special shield properties */
  specialProperties: z.array(z.string()).optional()
});

/**
 * Tool item schema with tool-specific properties
 */
const toolSchema = baseItemSchema.extend({
  itemType: z.literal('tool'),
  
  /** Tool category */
  toolCategory: z.enum(['artisan', 'gaming-set', 'musical-instrument', 'other']),
  
  /** Ability score typically associated with this tool */
  associatedAbility: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).optional(),
  
  /** What this tool can be used for */
  proficiencyApplications: z.array(z.string()).optional(),
  
  /** What items can be crafted with this tool */
  craftingCapabilities: z.array(z.string()).optional()
});

/**
 * General gear/equipment schema for adventuring gear
 */
const gearSchema = baseItemSchema.extend({
  itemType: z.literal('gear'),
  
  /** Gear subcategory for organization */
  gearCategory: z.enum(['container', 'consumable', 'utility', 'ammunition', 'other']),
  
  /** Container properties */
  capacity: z.object({
    weight: z.number(),      // Weight capacity in pounds
    volume: z.string()       // Volume capacity description
  }).optional(),
  
  /** Consumable properties */
  uses: z.number().optional(),
  
  /** Ammunition properties */
  compatibleWeapons: z.array(z.string()).optional(),
  quantity: z.number().optional()
});

/**
 * Discriminated union of all item types
 * This ensures type safety while allowing different schemas for different item types
 */
export const dndItemDataSchema = z.discriminatedUnion('itemType', [
  weaponSchema,
  armorSchema,
  shieldSchema,
  toolSchema,
  gearSchema
]);

/**
 * D&D Item document schema (runtime)
 * Note: Items are top-level documents, not VTT documents
 */
// Note: Item documents should use the standard itemSchema from shared
// This is just the plugin data schema
export const dndItemDocumentSchema = dndItemDataSchema;

/**
 * Runtime type exports
 */
export type DndItemData = z.infer<typeof dndItemDataSchema>;
export type DndItemDocument = z.infer<typeof dndItemDocumentSchema>;

/** Specific item type exports */
export type DndWeaponData = z.infer<typeof weaponSchema>;
export type DndArmorData = z.infer<typeof armorSchema>;
export type DndShieldData = z.infer<typeof shieldSchema>;
export type DndToolData = z.infer<typeof toolSchema>;
export type DndGearData = z.infer<typeof gearSchema>;

/**
 * Item type identifiers
 */
export const itemTypeIdentifiers = [
  'weapon', 'armor', 'shield', 'tool', 'gear'
] as const;

export type ItemTypeIdentifier = typeof itemTypeIdentifiers[number];

/**
 * Weapon category identifiers
 */
export const weaponCategoryIdentifiers = ['simple', 'martial', 'melee'] as const;
export type WeaponCategoryIdentifier = typeof weaponCategoryIdentifiers[number];

/**
 * Armor type identifiers
 */
export const armorTypeIdentifiers = ['light', 'medium', 'heavy'] as const;
export type ArmorTypeIdentifier = typeof armorTypeIdentifiers[number];

/**
 * Damage type identifiers
 */
export const damageTypeIdentifiers = [
  'slashing', 'piercing', 'bludgeoning', 'acid', 'cold', 'fire', 
  'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'
] as const;
export type DamageTypeIdentifier = typeof damageTypeIdentifiers[number];

/**
 * Weapon property identifiers
 */
export const weaponPropertyIdentifiers = [
  'ammunition', 'finesse', 'heavy', 'light', 'loading', 
  'range', 'reach', 'special', 'thrown', 'two-handed', 'versatile'
] as const;
export type WeaponPropertyIdentifier = typeof weaponPropertyIdentifiers[number];

/**
 * Weapon mastery identifiers (2024 D&D)
 */
export const weaponMasteryIdentifiers = [
  'cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'
] as const;
export type WeaponMasteryIdentifier = typeof weaponMasteryIdentifiers[number];