/**
 * TypeScript definitions for 5etools monster data structures
 */
import { z } from 'zod';
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsAbility
} from './base.mjs';

/**
 * Monster size categories
 */
export type EtoolsMonsterSize = 'T' | 'S' | 'M' | 'L' | 'H' | 'G';

/**
 * Monster types
 */
export type EtoolsMonsterType = 'aberration' | 'beast' | 'celestial' | 'construct' | 'dragon' | 'elemental' | 'fey' | 'fiend' | 'giant' | 'humanoid' | 'monstrosity' | 'ooze' | 'plant' | 'undead';

/**
 * Monster ability scores
 */
export interface EtoolsMonsterAbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

/**
 * Monster armor class specification
 */
export interface EtoolsMonsterAC {
  ac: number;
  from?: string[];
  condition?: string;
}

/**
 * Monster hit points specification
 */
export interface EtoolsMonsterHP {
  average?: number;
  formula?: string;
  special?: string;
}

/**
 * Monster speed specification
 */
export interface EtoolsMonsterSpeed {
  walk?: number;
  fly?: number;
  swim?: number;
  climb?: number;
  burrow?: number;
  hover?: boolean;
  canHover?: boolean;
}

/**
 * Monster saving throws
 */
export interface EtoolsMonsterSaves {
  str?: string;
  dex?: string;
  con?: string;
  int?: string;
  wis?: string;
  cha?: string;
}

/**
 * Monster skills
 */
export interface EtoolsMonsterSkills {
  [skill: string]: string;
}

/**
 * Monster damage vulnerabilities, resistances, immunities
 */
export interface EtoolsMonsterDamageType {
  [damageType: string]: string[] | string;
}

/**
 * Monster senses
 */
export interface EtoolsMonsterSenses {
  darkvision?: number;
  blindsight?: number;
  tremorsense?: number;
  truesight?: number;
  blindsightBlind?: boolean;
  passive?: number;
}

/**
 * Monster action specification
 */
export interface EtoolsMonsterAction {
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Monster legendary action specification
 */
export interface EtoolsMonsterLegendaryAction {
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Monster spell casting specification
 */
export interface EtoolsMonsterSpellcasting {
  name?: string;
  headerEntries?: EtoolsEntry[];
  ability?: EtoolsAbility;
  dc?: number;
  mod?: number;
  type?: string;
  spells?: {
    [level: string]: {
      spells: string[] | { [spell: string]: string };
      slots?: number;
      lower?: number;
      higher?: number;
    };
  };
  daily?: {
    [frequency: string]: string[];
  };
  will?: string[];
  ritual?: string[];
  rest?: {
    [restType: string]: string[];
  };
  charges?: {
    [spell: string]: number;
  };
  footerEntries?: EtoolsEntry[];
}

/**
 * Complete monster data structure from 5etools JSON
 */
export interface EtoolsMonster extends EtoolsSource {
  name: string;
  size: EtoolsMonsterSize[];
  type: string | {
    type: EtoolsMonsterType;
    tags?: string[];
  };
  alignment: string[];
  ac: EtoolsMonsterAC[];
  hp: EtoolsMonsterHP;
  speed: EtoolsMonsterSpeed;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  save?: EtoolsMonsterSaves;
  skill?: EtoolsMonsterSkills;
  senses?: string[] | EtoolsMonsterSenses;
  passive?: number;
  resist?: (string | EtoolsMonsterDamageType)[];
  immune?: (string | EtoolsMonsterDamageType)[];
  vulnerable?: (string | EtoolsMonsterDamageType)[];
  conditionImmune?: string[];
  languages?: string[];
  cr: string | number;
  pbNote?: string;
  trait?: EtoolsMonsterAction[];
  action?: EtoolsMonsterAction[];
  bonus?: EtoolsMonsterAction[];
  reaction?: EtoolsMonsterAction[];
  legendary?: EtoolsMonsterLegendaryAction[];
  legendaryHeader?: EtoolsEntry[];
  legendaryActions?: number;
  mythic?: EtoolsMonsterAction[];
  mythicHeader?: EtoolsEntry[];
  lair?: EtoolsEntry[];
  regionalEffects?: EtoolsEntry[];
  spellcasting?: EtoolsMonsterSpellcasting[];
  variant?: EtoolsEntry[];
  gear?: string[];
  dragonCastingColor?: string;
  environment?: string[];
  soundClip?: {
    type: string;
    path: string;
  };
  altArt?: Array<{
    name?: string;
    source?: string;
    page?: number;
  }>;
  tokenUrl?: string;
  fluff?: {
    entries?: EtoolsEntry[];
    images?: Array<{
      type: string;
      href: {
        type: string;
        path: string;
      };
    }>;
  };
  hasToken?: boolean;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
}

/**
 * Monster list data structure (root of monster JSON files)
 */
export interface EtoolsMonsterData {
  monster: EtoolsMonster[];
  _meta?: {
    sources?: Array<{
      json: string;
      abbreviation: string;
      full: string;
      url?: string;
      authors?: string[];
      convertedBy?: string[];
    }>;
    dateAdded?: number;
    dateLastModified?: number;
  };
}

/**
 * Zod schema for 5etools monster data validation - flexible to handle actual data structures
 */
export const etoolsMonsterSchema = z.object({
  // Basic identification
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  
  // Physical characteristics
  size: z.array(z.string()), // ['T', 'S', 'M', 'L', 'H', 'G']
  type: z.union([
    z.string(), // Simple type like "humanoid"
    z.object({   // Complex type with tags
      type: z.string(),
      tags: z.array(z.string()).optional()
    })
  ]),
  alignment: z.array(z.string()),
  
  // Combat stats
  ac: z.array(z.union([
    z.number(),
    z.object({
      ac: z.number(),
      from: z.array(z.string()).optional(),
      condition: z.string().optional()
    }),
    z.any() // Allow any structure for complex AC objects
  ])),
  hp: z.object({
    average: z.number().optional(),
    formula: z.string().optional(),
    special: z.string().optional()
  }),
  speed: z.union([
    z.number(), // Simple speed value
    z.object({
      walk: z.union([z.number(), z.object({ number: z.number(), condition: z.string().optional() })]).optional(),
      fly: z.union([z.number(), z.object({ number: z.number(), condition: z.string().optional() })]).optional(),
      swim: z.union([z.number(), z.object({ number: z.number(), condition: z.string().optional() })]).optional(),
      climb: z.union([z.number(), z.object({ number: z.number(), condition: z.string().optional() })]).optional(),
      burrow: z.union([z.number(), z.object({ number: z.number(), condition: z.string().optional() })]).optional(),
      hover: z.boolean().optional(),
      canHover: z.boolean().optional()
    })
  ]),
  
  // Ability scores (required)
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
  
  // Optional combat modifiers
  save: z.record(z.string()).optional(), // Saving throws
  skill: z.record(z.string()).optional(), // Skills
  
  // Senses (can be array of strings or object)
  senses: z.union([
    z.array(z.string()),
    z.object({
      darkvision: z.number().optional(),
      blindsight: z.number().optional(),
      tremorsense: z.number().optional(),
      truesight: z.number().optional(),
      blindsightBlind: z.boolean().optional(),
      passive: z.number().optional()
    })
  ]).optional(),
  passive: z.number().optional(), // Passive perception
  
  // Damage interactions
  resist: z.array(z.union([z.string(), z.any()])).optional(),
  immune: z.array(z.union([z.string(), z.any()])).optional(),
  vulnerable: z.array(z.union([z.string(), z.any()])).optional(),
  conditionImmune: z.array(z.union([z.string(), z.any()])).optional(), // Allow objects in condition immune array
  
  // Communication and challenge
  languages: z.array(z.string()).optional(),
  cr: z.union([
    z.string(), 
    z.number(),
    z.object({
      cr: z.union([z.string(), z.number()]),
      lair: z.union([z.string(), z.number()]).optional(),
      coven: z.union([z.string(), z.number()]).optional()
    })
  ]),
  pbNote: z.string().optional(),
  
  // Actions and abilities
  trait: z.array(z.object({
    name: z.string(),
    entries: z.array(z.any())
  })).optional(),
  action: z.array(z.object({
    name: z.string(),
    entries: z.array(z.any())
  })).optional(),
  bonus: z.array(z.object({
    name: z.string(),
    entries: z.array(z.any())
  })).optional(),
  reaction: z.array(z.object({
    name: z.string(),
    entries: z.array(z.any())
  })).optional(),
  
  // Legendary abilities
  legendary: z.array(z.object({
    name: z.string(),
    entries: z.array(z.any())
  })).optional(),
  legendaryHeader: z.array(z.any()).optional(),
  legendaryActions: z.number().optional(),
  
  // Mythic abilities
  mythic: z.array(z.object({
    name: z.string(),
    entries: z.array(z.any())
  })).optional(),
  mythicHeader: z.array(z.any()).optional(),
  
  // Environmental features
  lair: z.array(z.any()).optional(),
  regionalEffects: z.array(z.any()).optional(),
  environment: z.array(z.string()).optional(),
  
  // Spellcasting
  spellcasting: z.array(z.object({
    name: z.string().optional(),
    headerEntries: z.array(z.any()).optional(),
    ability: z.string().optional(),
    dc: z.number().optional(),
    mod: z.number().optional(),
    type: z.string().optional(),
    spells: z.record(z.any()).optional(),
    daily: z.record(z.array(z.string())).optional(),
    will: z.array(z.string()).optional(),
    ritual: z.array(z.string()).optional(),
    rest: z.record(z.array(z.string())).optional(),
    charges: z.record(z.number()).optional(),
    footerEntries: z.array(z.any()).optional()
  })).optional(),
  
  // Equipment and variants
  variant: z.array(z.any()).optional(),
  gear: z.array(z.union([z.string(), z.any()])).optional(), // Allow objects in gear array
  dragonCastingColor: z.string().optional(),
  
  // Media and presentation
  soundClip: z.object({
    type: z.string(),
    path: z.string()
  }).optional(),
  altArt: z.array(z.object({
    name: z.string().optional(),
    source: z.string().optional(),
    page: z.number().optional()
  })).optional(),
  tokenUrl: z.string().optional(),
  fluff: z.object({
    entries: z.array(z.any()).optional(),
    images: z.array(z.object({
      type: z.string(),
      href: z.object({
        type: z.string(),
        path: z.string()
      })
    })).optional()
  }).optional(),
  hasToken: z.boolean().optional(),
  hasFluff: z.boolean().optional(),
  hasFluffImages: z.boolean().optional(),
  
  // Additional fields for extensibility
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  reprintedAs: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties