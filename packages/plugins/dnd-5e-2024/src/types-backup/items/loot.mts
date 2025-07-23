import { z } from 'zod';
import { baseItemSchema } from './base-item.mjs';

/**
 * D&D 5e Loot data schema (treasure, trade goods, gems, art objects, etc.)
 * Based on Foundry VTT loot structure
 */
export const lootDataSchema = baseItemSchema.extend({
  // Loot type
  type: z.object({
    value: z.union([
      z.enum(['treasure', 'trade-good', 'gem', 'art', 'component', 'gear', 'other']),
      z.literal('') // Allow empty string for unspecified loot type
    ]),
    baseItem: z.string().default('')
  }).optional(),
  
  // Loot-specific properties
  properties: z.array(z.string()).default([]),
  
  // Value and rarity for treasure
  appraisal: z.object({
    value: z.number().min(0).default(0),
    currency: z.enum(['cp', 'sp', 'ep', 'gp', 'pp']).default('gp'),
    appraised: z.boolean().default(false)
  }).optional()
});

/**
 * Loot categories
 */
export const lootCategories = {
  treasure: ['coins', 'jewelry', 'precious-metals', 'magical-items'],
  'trade-good': ['spices', 'cloth', 'metals', 'livestock', 'goods'],
  gem: ['precious', 'semi-precious', 'ornamental'],
  art: ['paintings', 'sculptures', 'tapestries', 'books'],
  component: ['spell', 'crafting', 'alchemical', 'magical'],
  other: ['curiosities', 'documents', 'maps', 'keys']
} as const;

/**
 * Common loot properties
 */
export const lootProperties = [
  'valuable', 'fragile', 'bulky', 'rare', 'illegal', 'cursed'
] as const;

/**
 * Trade goods from the Player's Handbook
 */
export const tradeGoods = [
  'wheat', 'flour', 'chicken', 'salt', 'iron', 'canvas', 'copper',
  'cotton-cloth', 'ginger', 'goat', 'hemp', 'linen', 'pig', 'sheep',
  'square-yard-silk', 'silver', 'cinnamon', 'cloves', 'cow', 'ox',
  'pepper', 'saffron', 'gold', 'platinum'
] as const;

export type LootData = z.infer<typeof lootDataSchema>;
export type LootCategory = keyof typeof lootCategories;
export type LootProperty = typeof lootProperties[number];
export type TradeGood = typeof tradeGoods[number];