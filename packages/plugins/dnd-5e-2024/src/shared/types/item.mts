import { z } from 'zod';
import { weaponSchema} from './weapon.mjs';
import { spellSchema} from './spell.mjs';

// Common types for damage and properties
export const damageTypeSchema = z.enum([
  'acid', 'bludgeoning', 'cold', 'fire', 'force',
  'lightning', 'necrotic', 'piercing', 'poison',
  'psychic', 'radiant', 'slashing', 'thunder'
]);

export const itemPropertySchema = z.object({
  name: z.string(),
  abbreviation: z.string(),
  description: z.string().optional()
});

// Armor schema
export const armorSchema = z.object({
  type: z.literal('armor'),
  armorType: z.string(), // light, medium, heavy, shield (renamed from type)
  armorClass: z.number(),
  dexterityModifier: z.boolean().optional(), // Does AC include DEX?
  maxDexterityModifier: z.number().optional(), // Max DEX bonus
  minimumStrength: z.number().optional(),
  stealthDisadvantage: z.boolean().optional(),
  specialProperties: z.record(z.string(), z.any()).optional()
});

// Tool schema
export const toolSchema = z.object({
  type: z.literal('tool'),
  ability: z.string().optional(), // Primary ability used with the tool
  usage: z.string().optional(),
  specialProperties: z.record(z.string(), z.any()).optional()
});

// Adventuring gear schema
export const gearSchema = z.object({
  type: z.literal('gear'),
  usage: z.string().optional(), // how is it used
  properties: z.array(z.string()).optional(), // Changed to use simple strings
  specialProperties: z.record(z.string(), z.any()).optional()
});

// Consumable item schema (potions, scrolls, etc)
export const consumableSchema = z.object({
  type: z.literal('consumable'),
  consumableType: z.enum(['potion', 'scroll', 'wand', 'ammunition', 'food', 'other']), // renamed from type
  uses: z.number().default(1),
  effect: z.string(),
  duration: z.string().optional()
});

// Magic item schema (for magical items including weapons and armor)
export const magicItemSchema = z.object({
  type: z.literal('magic'),
  magicType: z.string(), // wondrous, ring, rod, staff, wand, armor, weapon, etc. (renamed from type)
  rarity: z.string().optional(), // common, uncommon, rare, very rare, legendary, artifact
  attunement: z.boolean().optional(),
  attunementRequirements: z.string().optional(),
  charges: z.number().optional(),
  rechargeable: z.boolean().optional(),
  rechargeRate: z.string().optional(), // e.g. "1d4 at dawn"
  activation: z.string().optional(), // command word, action, etc.
  enhancementBonus: z.number().optional(), // +1, +2, etc.
  specialProperties: z.record(z.string(), z.any()).optional()
});

// Update weaponSchema to include the type discriminator
const extendedWeaponSchema = weaponSchema.extend({
  type: z.literal('weapon')
});

// Update spellSchema to include the type discriminator
const extendedSpellSchema = spellSchema.extend({
  type: z.literal('spell')
});

// Create the discriminated union for ItemData (now using direct schemas, not nested)
export const itemDataSchema = z.discriminatedUnion('type', [
  extendedWeaponSchema,
  extendedSpellSchema,
  armorSchema,
  toolSchema,
  gearSchema,
  consumableSchema,
  magicItemSchema
]);

export type IItemData = z.infer<typeof itemDataSchema>;
export type IArmor = z.infer<typeof armorSchema>;
export type ITool = z.infer<typeof toolSchema>;
export type IGear = z.infer<typeof gearSchema>;
export type IConsumable = z.infer<typeof consumableSchema>;
export type IMagicItem = z.infer<typeof magicItemSchema>;

// Export const for each item type for validation functions
export const itemTypes = {
  weapon: extendedWeaponSchema,
  spell: extendedSpellSchema,
  armor: armorSchema,
  tool: toolSchema,
  gear: gearSchema,
  consumable: consumableSchema,
  magic: magicItemSchema
};

// Convert schemas to JSON Schema for plugin registration
export const armorJsonSchema = armorSchema.describe('D&D 5E Armor');
export const toolJsonSchema = toolSchema.describe('D&D 5E Tool');
export const gearJsonSchema = gearSchema.describe('D&D 5E Adventuring Gear');
export const consumableJsonSchema = consumableSchema.describe('D&D 5E Consumable');
export const magicItemJsonSchema = magicItemSchema.describe('D&D 5E Magic Item'); 