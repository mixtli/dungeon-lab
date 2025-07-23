import { z } from 'zod';

/**
 * Damage schema for weapons, spells, and abilities
 */
export const damageSchema = z.object({
  number: z.number().nullable(),
  denomination: z.number().min(0), // die size (d6 = 6, d20 = 20, etc.)
  types: z.array(z.string()), // damage types like ['fire'], ['piercing'], etc.
  custom: z.object({
    enabled: z.boolean().default(false),
    formula: z.string().optional()
  }),
  scaling: z.object({
    number: z.number().default(1)
  }),
  bonus: z.string().default('')
});

/**
 * Complete damage definition with base and versatile options
 */
export const weaponDamageSchema = z.object({
  base: damageSchema,
  versatile: damageSchema
});

/**
 * D&D damage types
 */
export const damageTypes = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 
  'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
] as const;

export const damageTypeSchema = z.enum(damageTypes);

export type Damage = z.infer<typeof damageSchema>;
export type WeaponDamage = z.infer<typeof weaponDamageSchema>;
export type DamageType = z.infer<typeof damageTypeSchema>;