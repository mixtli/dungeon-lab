import { z } from 'zod';

/**
 * D&D 5e Player Character Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Player Character runtime data schema
 * Based on Foundry VTT structure but typed for our needs
 */
export const dndCharacterDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  source: z.string().optional(),
  page: z.number().optional(),
  
  // Core abilities (STR, DEX, CON, INT, WIS, CHA)
  abilities: z.object({
    str: z.object({
      value: z.number().min(1).max(30),
      proficient: z.number().min(0).max(1).default(0),
      bonuses: z.object({
        check: z.string().default(''),
        save: z.string().default('')
      }).default({})
    }),
    dex: z.object({
      value: z.number().min(1).max(30),
      proficient: z.number().min(0).max(1).default(0),
      bonuses: z.object({
        check: z.string().default(''),
        save: z.string().default('')
      }).default({})
    }),
    con: z.object({
      value: z.number().min(1).max(30),
      proficient: z.number().min(0).max(1).default(0),
      bonuses: z.object({
        check: z.string().default(''),
        save: z.string().default('')
      }).default({})
    }),
    int: z.object({
      value: z.number().min(1).max(30),
      proficient: z.number().min(0).max(1).default(0),
      bonuses: z.object({
        check: z.string().default(''),
        save: z.string().default('')
      }).default({})
    }),
    wis: z.object({
      value: z.number().min(1).max(30),
      proficient: z.number().min(0).max(1).default(0),
      bonuses: z.object({
        check: z.string().default(''),
        save: z.string().default('')
      }).default({})
    }),
    cha: z.object({
      value: z.number().min(1).max(30),
      proficient: z.number().min(0).max(1).default(0),
      bonuses: z.object({
        check: z.string().default(''),
        save: z.string().default('')
      }).default({})
    })
  }),
  
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
    movement: z.object({
      burrow: z.number().min(0).default(0),
      climb: z.number().min(0).default(0),
      fly: z.number().min(0).default(0),
      swim: z.number().min(0).default(0),
      walk: z.number().min(0).default(30),
      units: z.string().default('ft'),
      hover: z.boolean().default(false)
    }),
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
    size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
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
  currency: z.object({
    pp: z.number().min(0).default(0), // platinum
    gp: z.number().min(0).default(0), // gold
    ep: z.number().min(0).default(0), // electrum
    sp: z.number().min(0).default(0), // silver
    cp: z.number().min(0).default(0)  // copper
  }),
  
  // Skills (all 18 D&D skills)
  skills: z.record(z.object({
    value: z.number().min(0).max(2).default(0), // 0=not proficient, 1=proficient, 2=expert
    ability: z.string(),
    bonuses: z.object({
      check: z.string().default(''),
      passive: z.string().default('')
    }).default({}),
    mod: z.number().default(0),
    total: z.number().default(0),
    passive: z.number().default(10)
  })),
  
  // Tools and spellcasting
  tools: z.record(z.unknown()),
  spells: z.record(z.unknown()),
  bonuses: z.record(z.unknown()),
  resources: z.record(z.unknown()),
  favorites: z.array(z.unknown()).default([]),
  bastion: z.record(z.unknown()).optional()
});

/**
 * D&D Character document schema (runtime)
 */
// Note: Character documents should use the standard actorSchema from shared
// This is just the plugin data schema
export const dndCharacterDocumentSchema = dndCharacterDataSchema;

/**
 * Runtime type exports
 */
export type DndCharacterData = z.infer<typeof dndCharacterDataSchema>;
export type DndCharacterDocument = z.infer<typeof dndCharacterDocumentSchema>;

// Legacy alias for backward compatibility
export const characterDataSchema = dndCharacterDataSchema;
export type CharacterData = DndCharacterData;