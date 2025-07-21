import { z } from 'zod';
import { sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * D&D 5e Spell data schema
 * Based on Foundry VTT spell structure but organized as VTTDocument
 */
export const spellDataSchema = z.object({
  // Core spell properties
  level: z.number().min(0).max(9), // 0 = cantrip
  school: z.enum(['abj', 'con', 'div', 'enc', 'evo', 'ill', 'nec', 'trs']),
  identifier: z.string(),
  
  // Description and source
  description: descriptionSchema,
  source: sourceSchema,
  
  // Spell components (stored as properties array in Foundry)
  properties: z.array(z.string()), // ['vocal', 'somatic', 'material', 'concentration']
  
  // Material components
  materials: z.object({
    value: z.string().default(''),
    consumed: z.boolean().default(false),
    cost: z.number().min(0).nullable().default(0), // Allow null for spells without material costs
    supply: z.number().min(0).default(0)
  }),
  
  // Preparation mode
  preparation: z.object({
    mode: z.enum(['prepared', 'pact', 'always', 'atwill', 'innate']),
    prepared: z.boolean().default(false)
  }),
  
  // Casting details
  activation: z.object({
    type: z.enum(['action', 'bonus', 'reaction', 'minute', 'hour', 'special']), // Added 'special' for unique activation conditions
    condition: z.string().default(''),
    value: z.number().nullable()
  }),
  
  // Duration
  duration: z.object({
    value: z.string(), // Can be number or string like "10" 
    units: z.enum(['inst', 'turn', 'round', 'minute', 'hour', 'day', 'month', 'year', 'perm', 'spec', 'disp', 'dstr']) // Added 'disp' for dispel, 'dstr' for destroy duration
  }),
  
  // Range
  range: z.object({
    units: z.enum(['self', 'touch', 'ft', 'mi', 'any', 'spec']),
    special: z.string().default('')
  }),
  
  // Target
  target: z.object({
    affects: z.object({
      choice: z.boolean(),
      count: z.string().optional(), // Allow undefined for spells without specific counts
      type: z.string().optional(), // Allow undefined for spells without specific target types
      special: z.string().default('')
    }),
    template: z.object({
      units: z.string().default(''),
      contiguous: z.boolean().default(false),
      type: z.string().default('')
    })
  }),
  
  // Uses and recovery
  uses: z.object({
    max: z.string().default(''),
    spent: z.number().default(0),
    recovery: z.array(z.object({
      period: z.string(), // "lr" (long rest), "sr" (short rest), etc.
      type: z.string(), // "recoverAll", "formula", etc.
      formula: z.string().optional() // only present when type is "formula"
    })).default([])
  }),
  
  // Activities (Foundry's complex spell effects system)
  activities: z.record(z.string(), z.object({
    type: z.string(),
    _id: z.string(),
    sort: z.number(),
    name: z.string().default(''),
    img: z.string().default(''),
    activation: z.object({
      type: z.string(),
      value: z.number().nullable(),
      override: z.boolean().default(false)
    }),
    // Allow flexible additional activity fields
    // This covers the complex nested structure Foundry uses
  }).passthrough()).default({})
});

/**
 * Spell schools with full names
 */
export const spellSchools = {
  abj: 'Abjuration',
  con: 'Conjuration', 
  div: 'Divination',
  enc: 'Enchantment',
  evo: 'Evocation',
  ill: 'Illusion',
  nec: 'Necromancy',
  trs: 'Transmutation'
} as const;

/**
 * Spell components
 */
export const spellComponents = ['vocal', 'somatic', 'material', 'concentration', 'ritual'] as const;

/**
 * Spell preparation modes
 */
export const preparationModes = ['prepared', 'pact', 'always', 'atwill', 'innate'] as const;

export type SpellData = z.infer<typeof spellDataSchema>;
export type SpellSchool = keyof typeof spellSchools;
export type SpellComponent = typeof spellComponents[number];
export type PreparationMode = typeof preparationModes[number];