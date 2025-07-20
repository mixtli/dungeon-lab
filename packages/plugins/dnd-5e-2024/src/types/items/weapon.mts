import { z } from 'zod';
import { baseItemSchema } from './base-item.mjs';

/**
 * D&D 5e Weapon data schema
 * Based on Foundry VTT weapon structure
 */
export const weaponDataSchema = baseItemSchema.extend({
  // Weapon-specific type
  type: z.object({
    value: z.enum(['simpleM', 'simpleR', 'martialM', 'martialR', 'siege']),
    baseItem: z.string().default('')
  }),
  
  // Weapon damage (matches Foundry's complex damage system)
  damage: z.object({
    base: z.object({
      number: z.number().nullable(),
      denomination: z.number().min(0), // die size (d6 = 6, d20 = 20)
      types: z.array(z.string()),
      custom: z.object({
        enabled: z.boolean().default(false)
      }),
      scaling: z.object({
        number: z.number().default(1)
      }),
      bonus: z.string().default('')
    }),
    versatile: z.object({
      number: z.number().nullable(),
      denomination: z.number().min(0),
      types: z.array(z.string()),
      custom: z.object({
        enabled: z.boolean().default(false)
      }),
      scaling: z.object({
        number: z.number().default(1)
      }),
      bonus: z.string().default('')
    })
  }),
  
  // Weapon properties and bonuses
  magicalBonus: z.number().default(0),
  properties: z.array(z.string()).default([]), // ['finesse', 'light', 'versatile', etc.]
  proficient: z.number().nullable().default(null),
  
  // Weapon range
  range: z.object({
    value: z.number().nullable().default(null),
    long: z.number().nullable().default(null),
    reach: z.number().nullable().default(null),
    units: z.string().default('')
  }),
  
  // Weapon mastery (D&D 2024 feature)
  mastery: z.string().default(''),
  
  // Ammunition
  ammunition: z.record(z.unknown()).default({}),
  
  // Armor value (for shields and protective weapons)
  armor: z.object({
    value: z.number().nullable().default(null)
  })
});

/**
 * Common weapon properties
 */
export const weaponProperties = [
  'ammunition', 'finesse', 'heavy', 'light', 'loading', 'range', 
  'reach', 'special', 'thrown', 'two-handed', 'versatile', 'magical'
] as const;

/**
 * Weapon mastery properties (D&D 2024)
 */
export const weaponMasteries = [
  'cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'
] as const;

export type WeaponData = z.infer<typeof weaponDataSchema>;
export type WeaponProperty = typeof weaponProperties[number];
export type WeaponMastery = typeof weaponMasteries[number];