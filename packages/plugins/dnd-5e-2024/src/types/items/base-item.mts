import { z } from 'zod';
import { priceSchema, sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * Base item schema shared by all item types
 * Contains common fields found in all Foundry items
 */
export const baseItemSchema = z.object({
  // Description and identification
  description: descriptionSchema,
  identifier: z.string(),
  source: sourceSchema,
  
  // Physical properties
  identified: z.boolean().default(true),
  unidentified: z.object({
    description: z.string().default('')
  }),
  container: z.string().nullable().default(null),
  quantity: z.number().min(1).default(1),
  weight: z.object({
    value: z.number().min(0),
    units: z.enum(['lb', 'kg']).default('lb')
  }),
  price: priceSchema,
  
  // Magic item properties
  rarity: z.enum(['common', 'uncommon', 'rare', 'veryrare', 'legendary', 'artifact']).default('common'),
  attunement: z.enum(['', 'required', 'optional']).default(''),
  attuned: z.boolean().default(false),
  equipped: z.boolean().default(false),
  
  // Combat/usage properties
  cover: z.number().nullable().default(null),
  crewed: z.boolean().default(false),
  hp: z.object({
    value: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
    dt: z.number().nullable().default(null), // damage threshold
    conditions: z.string().default('')
  }),
  
  // Usage and activities (Foundry's complex activity system)
  uses: z.object({
    spent: z.number().default(0),
    recovery: z.array(z.string()).default([]),
    max: z.string().default('')
  }),
  activities: z.record(z.string(), z.record(z.unknown())).default({})
});

export type BaseItemData = z.infer<typeof baseItemSchema>;