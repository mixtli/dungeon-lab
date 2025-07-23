import { z } from 'zod';
import { baseItemSchema } from './base-item.mjs';

/**
 * D&D 5e Tool data schema (artisan's tools, gaming sets, instruments, etc.)
 * Based on Foundry VTT tool structure
 */
export const toolDataSchema = baseItemSchema.extend({
  // Tool type
  type: z.object({
    value: z.enum(['', 'art', 'game', 'music', 'vehicle', 'other']),
    baseItem: z.string().default('')
  }).optional(),
  
  // Tool-specific properties
  properties: z.array(z.string()).default([]),
  proficient: z.number().nullable().default(null),
  
  // Tool abilities (what ability score is used)
  ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']).optional(),
  
  // Tool quality modifier (Foundry can send strings for expressions like "+1")
  bonus: z.union([z.string(), z.number()]).nullable().default(0)
});

/**
 * Tool categories
 */
export const toolCategories = {
  artisan: [
    'alchemists-supplies', 'brewers-supplies', 'calligraphers-supplies',
    'carpenters-tools', 'cartographers-tools', 'cobblers-tools',
    'cooks-utensils', 'glassblowers-tools', 'jewelers-tools',
    'leatherworkers-tools', 'masons-tools', 'painters-supplies',
    'potters-tools', 'smiths-tools', 'tinkers-tools', 'weavers-tools',
    'woodcarvers-tools'
  ],
  gaming: [
    'dice-set', 'dragonchess-set', 'playing-card-set', 'three-dragon-ante-set'
  ],
  musical: [
    'bagpipes', 'drum', 'dulcimer', 'flute', 'lute', 'lyre',
    'horn', 'pan-flute', 'shawm', 'viol'
  ],
  other: [
    'disguise-kit', 'forgery-kit', 'herbalism-kit', 'navigators-tools',
    'poisoners-kit', 'thieves-tools'
  ]
} as const;

/**
 * Common tool properties
 */
export const toolProperties = [
  'masterwork', 'magical', 'portable', 'complex'
] as const;

export type ToolData = z.infer<typeof toolDataSchema>;
export type ToolCategory = keyof typeof toolCategories;
export type ToolProperty = typeof toolProperties[number];