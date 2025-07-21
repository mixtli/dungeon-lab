import { z } from 'zod';
import { baseItemSchema } from './base-item.mjs';

/**
 * D&D 5e Consumable data schema (potions, scrolls, ammunition, etc.)
 * Based on Foundry VTT consumable structure
 */
export const consumableDataSchema = baseItemSchema.extend({
  // Consumable type
  type: z.object({
    value: z.enum(['', 'potion', 'scroll', 'wand', 'rod', 'ammo', 'food', 'poison', 'trinket', 'other']),
    baseItem: z.string().default('')
  }).optional(),
  
  // Consumable-specific properties
  properties: z.array(z.string()).default([]),
  magicalBonus: z.number().nullable().default(0),
  
  // Spell scroll specific fields
  spell: z.object({
    level: z.number().min(0).max(9).optional(),
    school: z.string().optional(),
    preparation: z.object({
      mode: z.string().default(''),
      prepared: z.boolean().default(false)
    }).optional()
  }).optional()
});

/**
 * Consumable subtypes
 */
export const consumableTypes = {
  potion: ['healing', 'mana', 'buff', 'utility'],
  scroll: ['spell', 'protection', 'utility'],
  ammo: ['arrow', 'bolt', 'bullet', 'dart', 'needle'],
  food: ['ration', 'feast', 'special'],
  poison: ['contact', 'ingested', 'inhaled', 'injury'],
  other: ['explosive', 'tool', 'component']
} as const;

/**
 * Common consumable properties
 */
export const consumableProperties = [
  'magical', 'silvered', 'adamantine', 'cold-iron', 'masterwork'
] as const;

export type ConsumableData = z.infer<typeof consumableDataSchema>;
export type ConsumableType = keyof typeof consumableTypes;
export type ConsumableProperty = typeof consumableProperties[number];