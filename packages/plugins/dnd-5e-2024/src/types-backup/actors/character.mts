import { z } from 'zod';
import { 
  abilitiesSchema, 
  currencySchema, 
  skillsSchema, 
  movementSchema, 
  creatureSizeSchema
} from '../common/index.mjs';

/**
 * D&D 5e Player Character data schema
 * Based on Foundry VTT structure but typed for our needs
 */
export const characterDataSchema = z.object({
  // Core abilities (STR, DEX, CON, INT, WIS, CHA)
  abilities: abilitiesSchema,
  
  // Character attributes
  attributes: z.object({
    ac: z.record(z.unknown()), // Complex AC calculation system
    hp: z.object({
      value: z.number().min(0),
      max: z.number().min(1),
      temp: z.number().min(0).default(0),
      tempmax: z.number().min(0).default(0)
    }),
    init: z.record(z.unknown()), // Initiative modifiers
    movement: movementSchema,
    attunement: z.record(z.unknown()),
    senses: z.record(z.unknown()),
    spellcasting: z.record(z.unknown()),
    death: z.record(z.unknown()), // Death saves
    exhaustion: z.number().min(0).max(6).default(0),
    inspiration: z.boolean().default(false),
    concentration: z.record(z.unknown())
  }),
  
  // Character details and background
  details: z.object({
    biography: z.object({
      value: z.string().default(''),
      public: z.string().default('')
    }),
    alignment: z.string().optional(),
    race: z.string().optional(),
    background: z.string().optional(),
    originalClass: z.string().optional(),
    xp: z.object({
      value: z.number().min(0).default(0),
      max: z.number().optional()
    }),
    appearance: z.string().default(''),
    trait: z.string().default(''),
    ideal: z.string().default(''),
    bond: z.string().default(''),
    flaw: z.string().default(''),
    eyes: z.string().default(''),
    height: z.string().default(''),
    faith: z.string().default(''),
    hair: z.string().default(''),
    weight: z.string().default(''),
    gender: z.string().default(''),
    skin: z.string().default(''),
    age: z.string().default('')
  }),
  
  // Character traits and resistances
  traits: z.object({
    size: creatureSizeSchema,
    languages: z.record(z.unknown()),
    di: z.record(z.unknown()), // damage immunities
    dr: z.record(z.unknown()), // damage resistances  
    dv: z.record(z.unknown()), // damage vulnerabilities
    ci: z.record(z.unknown()), // condition immunities
    weapon: z.record(z.unknown()), // weapon proficiencies
    armor: z.record(z.unknown()), // armor proficiencies
    tool: z.record(z.unknown()), // tool proficiencies
    sense: z.record(z.unknown()) // special senses
  }),
  
  // Money and resources
  currency: currencySchema,
  
  // Skills (all 18 D&D skills)
  skills: skillsSchema,
  
  // Tools and spellcasting
  tools: z.record(z.unknown()),
  spells: z.record(z.unknown()),
  bonuses: z.record(z.unknown()),
  resources: z.record(z.unknown()),
  favorites: z.array(z.unknown()).default([]),
  bastion: z.record(z.unknown()).optional()
});

export type CharacterData = z.infer<typeof characterDataSchema>;