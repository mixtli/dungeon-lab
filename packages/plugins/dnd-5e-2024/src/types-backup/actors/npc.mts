import { z } from 'zod';
import { 
  abilitiesSchema, 
  currencySchema, 
  skillsSchema, 
  movementSchema, 
  creatureSizeSchema,
  sourceSchema
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
    init: z.record(z.unknown()).optional(),
    movement: movementSchema,
    attunement: z.record(z.unknown()).optional(),
    senses: z.record(z.unknown()).optional(),
    spellcasting: z.union([z.string(), z.record(z.unknown())]).optional(),
    exhaustion: z.number().min(0).max(6).default(0),
    concentration: z.record(z.unknown()).optional(),
    ac: z.record(z.unknown()),
    hd: z.record(z.unknown()).optional(), // Hit dice
    hp: z.object({
      value: z.number().min(0), // Allow 0 HP for special creatures
      max: z.number().min(0), // Allow 0 max HP for special creatures
      formula: z.string().optional()
    }),
    death: z.record(z.unknown()).optional()
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
    race: z.string().nullable().optional(),
    type: z.object({
      value: z.string().optional(), // creature type (beast, humanoid, etc.)
      subtype: z.string().default(''),
      swarm: z.string().default(''),
      custom: z.string().default('')
    }).optional(),
    environment: z.string().default(''),
    cr: z.union([z.number(), z.string()]).nullable().optional(), // Challenge Rating
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
    languages: z.record(z.unknown()).optional()
  }),
  
  // Money, skills, tools, spells
  currency: currencySchema.optional(),
  skills: skillsSchema.optional(),
  tools: z.record(z.unknown()).optional(),
  spells: z.record(z.unknown()).optional(),
  bonuses: z.record(z.unknown()).optional(),
  resources: z.record(z.unknown()).optional(),
  source: sourceSchema.optional()
});

export type NPCData = z.infer<typeof npcDataSchema>;