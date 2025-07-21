import { z } from 'zod';
import { baseItemSchema } from './base-item.mjs';

/**
 * D&D 5e Equipment data schema (armor, clothing, trinkets, etc.)
 * Based on Foundry VTT equipment structure
 */
export const equipmentDataSchema = baseItemSchema.extend({
  // Equipment type
  type: z.object({
    value: z.enum(['', 'light', 'medium', 'heavy', 'shield', 'clothing', 'trinket', 'wand', 'wondrous', 'ring', 'rod', 'vehicle', 'other']),
    baseItem: z.string().default('')
  }).optional(),
  
  // Armor properties
  armor: z.object({
    value: z.number().nullable().default(null), // base AC value
    magicalBonus: z.number().nullable().default(null),
    dex: z.number().nullable().default(null) // max dex bonus
  }).optional(),
  
  // Additional equipment properties
  properties: z.array(z.string()).default([]),
  speed: z.object({
    value: z.number().nullable().default(null),
    conditions: z.string().default('')
  }).optional(),
  strength: z.number().nullable().default(null), // strength requirement
  proficient: z.number().nullable().default(null)
});

/**
 * Armor types for easy reference
 */
export const armorTypes = {
  light: ['padded', 'leather', 'studded-leather'],
  medium: ['hide', 'chain-shirt', 'scale-mail', 'breastplate', 'half-plate'],
  heavy: ['ring-mail', 'chain-mail', 'splint', 'plate'],
  shield: ['shield']
} as const;

/**
 * Common equipment properties
 */
export const equipmentProperties = [
  'stealth-disadvantage', 'magical', 'cursed', 'sentient'
] as const;

export type EquipmentData = z.infer<typeof equipmentDataSchema>;
export type ArmorType = keyof typeof armorTypes;
export type EquipmentProperty = typeof equipmentProperties[number];