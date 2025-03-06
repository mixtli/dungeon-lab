import { z } from 'zod';

export const spellSchema = z.object({
  level: z.number().min(0).max(9),
  school: z.enum([
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation'
  ]),
  castingTime: z.enum([
    'action',
    'bonus action',
    'reaction',
    '1 minute',
    '10 minutes',
    '1 hour',
    '8 hours',
    '24 hours',
    'ritual'
  ]),
  range: z.union([
    z.literal('self'),
    z.literal('touch'),
    z.object({
      type: z.literal('radius'),
      distance: z.number()
    }),
    z.object({
      type: z.literal('range'),
      distance: z.number()
    })
  ]),
  components: z.object({
    verbal: z.boolean(),
    somatic: z.boolean(),
    material: z.union([
      z.boolean(),
      z.object({
        items: z.string(),
        consumed: z.boolean().optional(),
        cost: z.number().optional()
      })
    ])
  }),
  duration: z.union([
    z.literal('instantaneous'),
    z.literal('until dispelled'),
    z.literal('concentration'),
    z.object({
      type: z.enum(['rounds', 'minutes', 'hours', 'days']),
      amount: z.number()
    })
  ]),
  description: z.string()
});

export type ISpell = z.infer<typeof spellSchema>;

// Convert schema to JSON Schema for plugin registration
export const spellJsonSchema = spellSchema.describe('D&D 5E Spell'); 