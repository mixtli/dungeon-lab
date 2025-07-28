/**
 * TypeScript definitions for 5etools species (race) data structures
 */
import { z } from 'zod';
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsAbility, 
  EtoolsChoice
} from './base.mjs';

/**
 * Species size categories
 */
export type EtoolsSpeciesSize = 'T' | 'S' | 'M' | 'L';

/**
 * Species ability score improvement specification
 */
export interface EtoolsSpeciesAbilityScoreImprovement {
  choose?: {
    from: EtoolsAbility[];
    count?: number;
    amount?: number;
  };
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
}

/**
 * Species speed specification
 */
export interface EtoolsSpeciesSpeed {
  walk?: number;
  fly?: number;
  swim?: number;
  climb?: number;
  burrow?: number;
  hover?: boolean;
  canHover?: boolean;
}

/**
 * Species age specification
 */
export interface EtoolsSpeciesAge {
  mature?: number;
  max?: number;
}

/**
 * Species trait specification
 */
export interface EtoolsSpeciesTrait {
  name: string;
  entries: EtoolsEntry[];
  type?: string;
}

/**
 * Subrace specification
 */
export interface EtoolsSubrace extends EtoolsSource {
  name: string;
  ability?: EtoolsSpeciesAbilityScoreImprovement[];
  entries?: EtoolsEntry[];
  traitTags?: string[];
  skillProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [skill: string]: boolean | EtoolsChoice<string> | undefined;
  }>;
  languageProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [language: string]: boolean | EtoolsChoice<string> | undefined;
  }>;
  toolProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [tool: string]: boolean | EtoolsChoice<string> | undefined;
  }>;
  armorProficiencies?: string[];
  weaponProficiencies?: string[];
  resist?: string[];
  immune?: string[];
  conditionImmune?: string[];
  additionalSpells?: Array<{
    known?: Record<string, string[]>;
    prepared?: Record<string, string[]>;
    expanded?: Record<string, string[]>;
    ability?: EtoolsAbility;
    innate?: Record<string, Record<string, string[]>>;
  }>;
  darkvision?: number;
  blindsight?: number;
  speed?: EtoolsSpeciesSpeed;
  age?: EtoolsSpeciesAge;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  additionalSources?: EtoolsSource[];
  otherSources?: EtoolsSource[];
  reprintedAs?: string[];
  overwrite?: {
    [field: string]: unknown;
  };
  _copy?: {
    name: string;
    source: string;
    _mod?: {
      [key: string]: unknown;
    };
  };
}

/**
 * Complete species data structure from 5etools JSON
 */
export interface EtoolsSpecies extends EtoolsSource {
  name: string;
  ability: EtoolsSpeciesAbilityScoreImprovement[];
  size: EtoolsSpeciesSize[];
  speed: EtoolsSpeciesSpeed;
  entries: EtoolsEntry[];
  
  // Proficiencies
  skillProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [skill: string]: boolean | EtoolsChoice<string> | undefined;
  }>;
  
  languageProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [language: string]: boolean | EtoolsChoice<string> | undefined;
  }>;
  
  toolProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [tool: string]: boolean | EtoolsChoice<string> | undefined;
  }>;
  
  armorProficiencies?: string[];
  weaponProficiencies?: string[];
  
  // Special abilities
  darkvision?: number;
  blindsight?: number;
  truesight?: number;
  
  // Resistances and immunities
  resist?: string[];
  immune?: string[];
  vulnerable?: string[];
  conditionImmune?: string[];
  
  // Spellcasting
  additionalSpells?: Array<{
    known?: Record<string, string[]>;
    prepared?: Record<string, string[]>;
    expanded?: Record<string, string[]>;
    ability?: EtoolsAbility;
    innate?: Record<string, Record<string, string[]>>;
  }>;
  
  // Physical characteristics
  age?: EtoolsSpeciesAge;
  heightAndWeight?: {
    baseHeight?: number;
    heightMod?: string;
    baseWeight?: number;
    weightMod?: string;
  };
  
  // Subraces
  subraces?: EtoolsSubrace[];
  
  // Traits and tags
  traitTags?: string[];
  
  // Lineage options (newer format)
  lineage?: string;
  creatureTypes?: string[];
  creatureTypeTags?: string[];
  
  // Optional metadata
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  additionalSources?: EtoolsSource[];
  otherSources?: EtoolsSource[];
  reprintedAs?: string[];
  
  // Inheritance tracking
  _copy?: {
    name: string;
    source: string;
    _mod?: {
      [key: string]: unknown;
    };
  };
  
  // Foundry-specific fields
  foundrySystem?: Record<string, unknown>;
  foundryFlags?: Record<string, unknown>;
  foundryEffects?: Array<Record<string, unknown>>;
  foundryImg?: string;
}

/**
 * Species list data structure (root of species JSON files)
 */
export interface EtoolsSpeciesData {
  race?: EtoolsSpecies[];
  subrace?: EtoolsSubrace[];
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
 * Species fluff data structure
 */
export interface EtoolsSpeciesFluff extends EtoolsSource {
  name: string;
  entries?: EtoolsEntry[];
  images?: Array<{
    type: string;
    href: {
      type: string;
      path: string;
    };
    title?: string;
    altText?: string;
    width?: number;
    height?: number;
    credit?: string;
  }>;
}

/**
 * Species fluff data structure (fluff files)
 */
export interface EtoolsSpeciesFluffData {
  raceFluff?: EtoolsSpeciesFluff[];
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

// Zod schemas for validation

export const etoolsSpeciesAbilityScoreImprovementSchema = z.object({
  choose: z.object({
    from: z.array(z.string()),
    count: z.number().optional(),
    amount: z.number().optional()
  }).optional(),
  str: z.number().optional(),
  dex: z.number().optional(),
  con: z.number().optional(),
  int: z.number().optional(),
  wis: z.number().optional(),
  cha: z.number().optional()
}).passthrough();

export const etoolsSpeciesSpeedSchema = z.union([
  z.number(), // Speed can be just a number
  z.object({
    walk: z.number().optional(),
    fly: z.union([z.number(), z.boolean()]).optional(), // Can be boolean for "has fly speed"
    swim: z.union([z.number(), z.boolean()]).optional(), // Can be boolean for "has swim speed"
    climb: z.union([z.number(), z.boolean()]).optional(), // Can be boolean for "has climb speed"
    burrow: z.number().optional(),
    hover: z.boolean().optional(),
    canHover: z.boolean().optional()
  }).passthrough()
]);

export const etoolsSpeciesSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  ability: z.array(etoolsSpeciesAbilityScoreImprovementSchema).optional(),
  size: z.array(z.string()).optional(),
  speed: etoolsSpeciesSpeedSchema.optional(),
  entries: z.array(z.any()).optional(),
  skillProficiencies: z.array(z.any()).optional(),
  languageProficiencies: z.array(z.any()).optional(),
  toolProficiencies: z.array(z.any()).optional(),
  armorProficiencies: z.array(z.union([z.string(), z.any()])).optional(),
  weaponProficiencies: z.array(z.union([z.string(), z.any()])).optional(),
  darkvision: z.number().optional(),
  blindsight: z.number().optional(),
  truesight: z.number().optional(),
  resist: z.array(z.union([z.string(), z.any()])).optional(),
  immune: z.array(z.string()).optional(),
  vulnerable: z.array(z.string()).optional(),
  conditionImmune: z.array(z.string()).optional(),
  additionalSpells: z.array(z.any()).optional(),
  age: z.any().optional(),
  heightAndWeight: z.any().optional(),
  subraces: z.array(z.any()).optional(),
  traitTags: z.array(z.string()).nullable().optional(),
  lineage: z.union([z.string(), z.boolean()]).optional(),
  creatureTypes: z.array(z.string()).optional(),
  creatureTypeTags: z.array(z.string()).optional()
}).passthrough();

export const etoolsSpeciesDataSchema = z.object({
  race: z.array(etoolsSpeciesSchema)
}).passthrough();

export const etoolsSpeciesFluffSchema = z.object({
  name: z.string(),
  source: z.string(),
  entries: z.array(z.any()).optional(),
  images: z.array(z.object({
    type: z.string(),
    href: z.object({
      type: z.string(),
      path: z.string()
    })
  })).optional()
}).passthrough();

export const etoolsSpeciesFluffDataSchema = z.object({
  raceFluff: z.array(etoolsSpeciesFluffSchema).optional()
}).passthrough();