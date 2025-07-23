import { z } from 'zod';

export const spellSchema = z.object({
  name: z.string(),
  level: z.number().min(0).max(9),
  classes: z.array(z.string()),
  school: z.string(),
  castingTime: z.string(),
  range: z.union([
    z.literal('self'),
    z.literal('touch'),
    z.string(),
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
    ]),
    materialDescription: z.string().optional()
  }),
  savingThrow: z.array(z.string()).optional(),
  damageType: z.array(z.string()).optional(),
  damage: z.record(z.string(), z.string()).optional(),
  duration: z.union([
    z.string(),
    z.object({
      type: z.enum(['rounds', 'minutes', 'hours', 'days']),
      amount: z.number()
    })
  ]),
  description: z.string(),
  higherLevelDescription: z.string().optional(),
  ritual: z.boolean().optional(),
  concentration: z.boolean().optional(),
  source: z.string().optional(),
  page: z.number().optional(),
  scaling: z.object({
    formula: z.record(z.string(), z.string()),
    description: z.string()
  }).optional()
});

export type ISpell = z.infer<typeof spellSchema>;

// Convert schema to JSON Schema for plugin registration
export const spellJsonSchema = spellSchema.describe('D&D 5E Spell'); 