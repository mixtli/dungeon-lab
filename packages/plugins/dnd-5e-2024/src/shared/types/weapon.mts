import { z } from 'zod';

// Define damage types as a union instead of an enum for more flexibility
export const damageTypes = [
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
] as const;

export type DamageType = typeof damageTypes[number];

export const weaponSchema = z.object({
  damage: z.string(),
  damageType: z.string(), // Changed from enum to string to be more flexible
  range: z.union([
    z.literal('melee'),
    z.object({
      normal: z.number(),
      long: z.number().optional()
    })
  ]),
  masteryProperty: z.string().optional(),
  properties: z.array(z.string()) // Changed to use strings instead of enum for more flexibility
});

export type IWeapon = z.infer<typeof weaponSchema>;
