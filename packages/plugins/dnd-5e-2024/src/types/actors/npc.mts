import { z } from 'zod';
import { 
  abilitiesSchema, 
  currencySchema, 
  skillsSchema, 
  movementSchema, 
  creatureSizeSchema,
  sourceSchema,
  descriptionSchema 
} from '../common/index.mjs';

/**
 * D&D 5e NPC/Monster data schema
 * Based on Foundry VTT structure but typed for our needs
 */
export const npcDataSchema = z.object({
  // Core abilities
  abilities: abilitiesSchema,
  
  // Creature attributes
  attributes: z.object({
    init: z.record(z.unknown()),
    movement: movementSchema,
    attunement: z.record(z.unknown()),
    senses: z.record(z.unknown()),
    spellcasting: z.record(z.unknown()),
    exhaustion: z.number().min(0).max(6).default(0),
    concentration: z.record(z.unknown()),
    ac: z.record(z.unknown()),
    hd: z.record(z.unknown()), // Hit dice
    hp: z.object({
      value: z.number().min(1),
      max: z.number().min(1),
      formula: z.string().optional()
    }),
    death: z.record(z.unknown())
  }),
  
  // Creature details
  details: z.object({
    biography: z.object({
      value: z.string().default(''),
      public: z.string().default('')
    }),
    alignment: z.string().optional(),
    ideal: z.string().default(''),
    bond: z.string().default(''),
    flaw: z.string().default(''),
    race: z.string().optional(),
    type: z.object({
      value: z.string(), // creature type (beast, humanoid, etc.)
      subtype: z.string().default(''),
      swarm: z.string().default(''),
      custom: z.string().default('')
    }),
    environment: z.string().default(''),
    cr: z.union([z.number(), z.string()]), // Challenge Rating
    spellLevel: z.number().min(0).default(0)
  }),
  
  // Creature traits and immunities  
  traits: z.object({
    size: creatureSizeSchema,
    di: z.record(z.unknown()), // damage immunities
    dr: z.record(z.unknown()), // damage resistances
    dv: z.record(z.unknown()), // damage vulnerabilities
    dm: z.record(z.unknown()), // damage modifiers
    ci: z.record(z.unknown()), // condition immunities
    languages: z.record(z.unknown())
  }),
  
  // Money, skills, tools, spells
  currency: currencySchema,
  skills: skillsSchema,
  tools: z.record(z.unknown()),
  spells: z.record(z.unknown()),
  bonuses: z.record(z.unknown()),
  resources: z.record(z.unknown()),
  source: sourceSchema
});

export type NPCData = z.infer<typeof npcDataSchema>;