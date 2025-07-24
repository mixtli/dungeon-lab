/**
 * TypeScript definitions for 5etools species (race) data structures
 */
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