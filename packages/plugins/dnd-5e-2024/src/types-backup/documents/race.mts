import { z } from 'zod';
import { sourceSchema, descriptionSchema, movementSchema, creatureSizeSchema } from '../common/index.mjs';

/**
 * D&D 5e Race data schema
 * Based on Foundry VTT race structure
 */
export const raceDataSchema = z.object({
  // Basic race info
  identifier: z.string(), // unique race identifier like 'human'
  description: descriptionSchema,
  source: sourceSchema,
  
  // Character advancement from race
  advancement: z.array(z.record(z.unknown())).default([]), // Complex advancement system
  
  // Physical characteristics
  movement: movementSchema,
  senses: z.object({
    darkvision: z.number().min(0).nullable().default(0),
    blindsight: z.number().min(0).nullable().default(0),
    tremorsense: z.number().min(0).nullable().default(0),
    truesight: z.number().min(0).nullable().default(0),
    special: z.string().default('')
  }),
  
  // Race type and subtype
  type: z.object({
    value: z.enum(['humanoid', 'fey', 'construct', 'undead', 'fiend', 'celestial']).default('humanoid'),
    subtype: z.string().default(''),
    custom: z.string().default('')
  }),
  
  // Size
  size: creatureSizeSchema.default('med'),
  
  // Racial traits
  traits: z.object({
    // Damage resistances, immunities, vulnerabilities
    dr: z.array(z.string()).default([]), // damage resistance
    di: z.array(z.string()).default([]), // damage immunity
    dv: z.array(z.string()).default([]), // damage vulnerability
    ci: z.array(z.string()).default([]), // condition immunity
    
    // Languages
    languages: z.object({
      value: z.array(z.string()).default([]),
      custom: z.string().default('')
    }).optional()
  }).optional(),
  
  // Age and lifespan
  age: z.object({
    maturity: z.number().optional(),
    max: z.number().optional()
  }).optional()
});

/**
 * Race identifiers from D&D 5e 2024
 */
export const raceIdentifiers = [
  'human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'half-elf', 'half-orc', 'tiefling'
] as const;

/**
 * Creature types
 */
export const creatureTypes = ['humanoid', 'fey', 'construct', 'undead', 'fiend', 'celestial'] as const;

/**
 * Common racial movement speeds
 */
export const racialMovement = {
  human: { walk: 30 },
  elf: { walk: 30 },
  dwarf: { walk: 25 },
  halfling: { walk: 25 },
  dragonborn: { walk: 30 },
  gnome: { walk: 25 },
  'half-elf': { walk: 30 },
  'half-orc': { walk: 30 },
  tiefling: { walk: 30 }
} as const;

/**
 * Common racial traits
 */
export const racialTraits = {
  darkvision: 'Can see in dim light within 60 feet as if it were bright light',
  'fey-ancestry': 'Advantage on saving throws against being charmed',
  'keen-senses': 'Proficiency in the Perception skill',
  'lucky': 'Can reroll natural 1s on attack rolls, ability checks, and saving throws',
  'brave': 'Advantage on saving throws against being frightened'
} as const;

export type RaceData = z.infer<typeof raceDataSchema>;
export type RaceIdentifier = typeof raceIdentifiers[number];
export type CreatureType = typeof creatureTypes[number];