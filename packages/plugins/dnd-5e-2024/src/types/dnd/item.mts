import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { referenceObjectSchema } from '@dungeon-lab/shared/types/index.mjs';
import { 
  damageTypeSchema,
  weaponCategorySchema,
  weaponTypeSchema,
  weaponMasteryProperty,
  armorTypeSchema,
  currencyTypeSchema,
  itemRaritySchema
} from './common.mjs';

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
 * D&D 5e 2024 Item Runtime Types
 * 
 * Updated for 2024 item system with weapon mastery, enhanced magic properties,
 * and better type discrimination. Uses discriminated union for type safety.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Weapon item schema with weapon-specific properties
 */
export const weaponSchema = z.object({
  itemType: z.literal('weapon'),
  name: z.string(),
  description: z.string(),
  
  /** Basic weapon properties */
  damage: z.object({
    dice: z.string(), // e.g., "1d8"
    type: damageTypeSchema // Allow all damage types for magical weapons
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
    dice: z.string(), // e.g., "1d10"
    type: damageTypeSchema // Same damage type as primary
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
 * Armor item schema with armor-specific properties
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
 * General gear schema for other items
 */
export const gearSchema = z.object({
  itemType: z.literal('gear'),
  name: z.string(),
  description: z.string(),
  
  /** Gear subcategory */
  category: z.enum(['consumable', 'container', 'tool', 'ammunition', 'treasure', 'other']).optional(),
  
  /** Physical properties */
  weight: z.number().optional(),
  cost: z.object({
    amount: z.number(),
    currency: currencyTypeSchema.default('gp')
  }).optional(),
  
  /** Magic properties */
  magical: z.boolean().default(false),
  rarity: itemRaritySchema.optional(),
  attunement: z.boolean().default(false),
  
  /** Usage properties */
  consumable: z.object({
    uses: z.number(),
    duration: z.string().optional()
  }).optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Tool schema for artisan tools, gaming sets, instruments, etc.
 */
export const toolSchema = z.object({
  itemType: z.literal('tool'),
  name: z.string(),
  description: z.string(),
  
  /** Tool category */
  category: z.enum(['artisan', 'gaming-set', 'musical-instrument', 'other']).optional(),
  
  /** Reference to parent item group */
  itemGroup: referenceObjectSchema.optional(),
  
  /** Physical properties */
  weight: z.number().optional(),
  cost: z.object({
    amount: z.number(),
    currency: currencyTypeSchema.default('gp')
  }).optional(),
  
  /** Magic properties */
  magical: z.boolean().default(false),
  rarity: itemRaritySchema.optional(),
  attunement: z.boolean().default(false),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * Discriminated union of all item types
 * This ensures type safety while allowing different schemas for different item types
 */
export const dndItemDataSchema = z.discriminatedUnion('itemType', [
  weaponSchema,
  armorSchema,
  gearSchema,
  toolSchema
]);

/**
 * D&D Item document schema (runtime) 
 * Extends base VTT document with item-specific plugin data
 */
export const dndItemDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('item'),
  pluginData: dndItemDataSchema
});

/**
 * Runtime type exports
 */
export type DndItemData = z.infer<typeof dndItemDataSchema>;
export type DndItemDocument = z.infer<typeof dndItemDocumentSchema>;

/** Specific item type exports */
export type DndWeaponData = z.infer<typeof weaponSchema>;
export type DndArmorData = z.infer<typeof armorSchema>;
export type DndGearData = z.infer<typeof gearSchema>;
export type DndToolData = z.infer<typeof toolSchema>;

/**
 * Item type identifiers
 */
export const itemTypeIdentifiers = [
  'weapon', 'armor', 'gear', 'tool'
] as const;

export type ItemTypeIdentifier = typeof itemTypeIdentifiers[number];

