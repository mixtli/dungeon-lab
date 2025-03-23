import { z } from 'zod';
import { weaponSchema, IWeapon } from './weapon.mjs';
import { spellSchema, ISpell } from './spell.mjs';

// Armor schema
export const armorSchema = z.object({
  type: z.enum(['light', 'medium', 'heavy', 'shield']),
  armorClass: z.object({
    base: z.number(),
    dexBonus: z.boolean(),
    maxDexBonus: z.number().optional()
  }),
  strengthRequired: z.number().optional(),
  stealthDisadvantage: z.boolean().default(false),
  properties: z.array(z.string()).optional()
});

// Tool schema
export const toolSchema = z.object({
  type: z.enum(['artisan', 'musical', 'gaming', 'specialist']),
  ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).optional(),
  proficiency: z.enum(['none', 'proficient', 'expertise']).default('none'),
  properties: z.array(z.string()).optional(),
  description: z.string()
});

// Adventuring gear schema
export const gearSchema = z.object({
  weight: z.number().optional(),
  properties: z.array(z.string()).optional(),
  description: z.string()
});

// Consumable item schema (potions, scrolls, etc)
export const consumableSchema = z.object({
  type: z.enum(['potion', 'scroll', 'wand', 'ammunition', 'food', 'other']),
  uses: z.number().default(1),
  effect: z.string(),
  duration: z.string().optional()
});

export type IArmor = z.infer<typeof armorSchema>;
export type ITool = z.infer<typeof toolSchema>;
export type IGear = z.infer<typeof gearSchema>;
export type IConsumable = z.infer<typeof consumableSchema>;

// Create the discriminated union for ItemData
export const itemDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('weapon'), data: weaponSchema }),
  z.object({ type: z.literal('spell'), data: spellSchema }),
  z.object({ type: z.literal('armor'), data: armorSchema }),
  z.object({ type: z.literal('tool'), data: toolSchema }),
  z.object({ type: z.literal('gear'), data: gearSchema }),
  z.object({ type: z.literal('consumable'), data: consumableSchema })
]);

export type IItemData = z.infer<typeof itemDataSchema>;

// Export const for each item type for validation functions
export const itemTypes = {
  weapon: weaponSchema,
  spell: spellSchema,
  armor: armorSchema,
  tool: toolSchema,
  gear: gearSchema,
  consumable: consumableSchema
};

// Convert schemas to JSON Schema for plugin registration
export const armorJsonSchema = armorSchema.describe('D&D 5E Armor');
export const toolJsonSchema = toolSchema.describe('D&D 5E Tool');
export const gearJsonSchema = gearSchema.describe('D&D 5E Adventuring Gear');
export const consumableJsonSchema = consumableSchema.describe('D&D 5E Consumable'); 