import { z } from 'zod';
import { baseItemSchema } from './base-item.mjs';

/**
 * D&D 5e Container data schema (bags, chests, backpacks, etc.)
 * Based on Foundry VTT container structure
 */
export const containerDataSchema = baseItemSchema.extend({
  // Container type
  type: z.object({
    value: z.enum(['backpack', 'bag', 'chest', 'pouch', 'quiver', 'case', 'other']),
    baseItem: z.string().default('')
  }),
  
  // Container-specific properties
  properties: z.array(z.string()).default([]),
  
  // Capacity and contents
  capacity: z.object({
    type: z.enum(['weight', 'items']).default('weight'),
    value: z.number().min(0).default(0),
    weightless: z.boolean().default(false) // bags of holding, etc.
  }),
  
  // Container state
  locked: z.boolean().default(false),
  
  // Currency storage (for coinpurses, etc.)
  currency: z.object({
    cp: z.number().min(0).default(0),
    sp: z.number().min(0).default(0),
    ep: z.number().min(0).default(0),
    gp: z.number().min(0).default(0),
    pp: z.number().min(0).default(0)
  }).optional()
});

/**
 * Container types and their typical capacities
 */
export const containerTypes = {
  backpack: { capacity: 30, type: 'weight' as const },
  bag: { capacity: 10, type: 'weight' as const },
  chest: { capacity: 300, type: 'weight' as const },
  pouch: { capacity: 6, type: 'weight' as const },
  quiver: { capacity: 20, type: 'items' as const },
  case: { capacity: 5, type: 'items' as const }
} as const;

/**
 * Common container properties
 */
export const containerProperties = [
  'magical', 'waterproof', 'fireproof', 'locked', 'trapped', 'weightless'
] as const;

export type ContainerData = z.infer<typeof containerDataSchema>;
export type ContainerType = keyof typeof containerTypes;
export type ContainerProperty = typeof containerProperties[number];