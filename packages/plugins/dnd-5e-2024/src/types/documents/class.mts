import { z } from 'zod';
import { sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * D&D 5e Class data schema
 * Based on Foundry VTT class structure
 */
export const classDataSchema = z.object({
  // Basic class info
  identifier: z.string(), // unique class identifier like 'barbarian'
  description: descriptionSchema,
  source: sourceSchema,
  
  // Class progression
  levels: z.number().min(1).max(20).default(1),
  advancement: z.array(z.record(z.unknown())).default([]), // Complex advancement system
  
  // Hit dice and health
  hd: z.object({
    faces: z.number().min(4).max(12), // d4, d6, d8, d10, d12
    number: z.number().min(1).default(1)
  }).optional(),
  
  // Core abilities and saves
  primaryAbility: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])).default([]),
  saves: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])).default([]),
  
  // Skills
  skills: z.object({
    number: z.number().min(0).default(0),
    choices: z.array(z.string()).default([]),
    value: z.array(z.string()).default([])
  }).optional(),
  
  // Spellcasting
  spellcasting: z.object({
    progression: z.enum(['none', 'full', 'half', 'third', 'pact', 'artificer']).default('none'),
    ability: z.enum(['int', 'wis', 'cha']).optional(),
    ritual: z.boolean().default(false),
    focus: z.boolean().default(false)
  }).optional(),
  
  // Starting equipment and wealth
  startingEquipment: z.array(z.record(z.unknown())).default([]),
  wealth: z.string().default('')
});

/**
 * Class identifiers from D&D 5e 2024
 */
export const classIdentifiers = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'
] as const;

/**
 * Spellcasting progressions
 */
export const spellcastingProgressions = {
  none: 'Non-spellcaster',
  full: 'Full Spellcaster',
  half: 'Half Spellcaster', 
  third: 'Third Spellcaster',
  pact: 'Pact Magic',
  artificer: 'Artificer Spellcasting'
} as const;

/**
 * Hit die faces by class
 */
export const classHitDice = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  bard: 8,
  cleric: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  sorcerer: 6,
  wizard: 6
} as const;

export type ClassData = z.infer<typeof classDataSchema>;
export type ClassIdentifier = typeof classIdentifiers[number];
export type SpellcastingProgression = keyof typeof spellcastingProgressions;