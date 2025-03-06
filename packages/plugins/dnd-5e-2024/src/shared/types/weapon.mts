import { z } from 'zod';

export const weaponSchema = z.object({
  damage: z.string(),
  damageType: z.enum([
    'slashing',
    'piercing',
    'bludgeoning',
    'acid',
    'cold',
    'fire',
    'force',
    'lightning',
    'necrotic',
    'poison',
    'psychic',
    'radiant',
    'thunder'
  ]),
  range: z.union([
    z.literal('melee'),
    z.object({
      normal: z.number(),
      long: z.number().optional()
    })
  ]),
  properties: z.array(z.enum([
    'ammunition',
    'finesse',
    'heavy',
    'light',
    'loading',
    'reach',
    'special',
    'thrown',
    'two-handed',
    'versatile'
  ]))
});

export type IWeapon = z.infer<typeof weaponSchema>;

// Convert Zod schema to JSON Schema for plugin registration
const zodJsonSchema = weaponSchema.describe('D&D 5E Weapon');

// Convert to plain object for plugin registration
export const weaponJsonSchema = {
  type: 'object',
  required: ['damage', 'damageType', 'range', 'properties'],
  properties: {
    damage: { type: 'string' },
    damageType: {
      type: 'string',
      enum: [
        'slashing', 'piercing', 'bludgeoning',
        'acid', 'cold', 'fire', 'force',
        'lightning', 'necrotic', 'poison',
        'psychic', 'radiant', 'thunder'
      ]
    },
    range: {
      oneOf: [
        { type: 'string', enum: ['melee'] },
        {
          type: 'object',
          required: ['normal'],
          properties: {
            normal: { type: 'number' },
            long: { type: 'number' }
          }
        }
      ]
    },
    properties: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'ammunition', 'finesse', 'heavy',
          'light', 'loading', 'reach',
          'special', 'thrown', 'two-handed',
          'versatile'
        ]
      }
    }
  }
}; 