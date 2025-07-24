/**
 * TypeScript definitions for 5etools feat data structures
 */
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsAbility
} from './base.mjs';

/**
 * Feat prerequisite specification
 */
export interface EtoolsFeatPrerequisite {
  level?: number;
  proficiency?: string[];
  spellcasting?: boolean;
  spellcastingFeature?: boolean;
  spellcastingPrepared?: boolean;
  ability?: Array<{
    [ability in EtoolsAbility]?: number;
  }>;
  race?: Array<{
    name: string;
    source?: string;
    subrace?: string;
  }>;
  background?: Array<{
    name: string;
    source?: string;
  }>;
  feat?: string[];
  item?: string[];
  other?: string;
  otherSummary?: {
    entry: string;
    entrySummary: string;
  };
  campaign?: string[];
  group?: string[];
  psionics?: boolean;
}

/**
 * Feat ability score improvement specification
 */
export interface EtoolsFeatAbilityScoreImprovement {
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
 * Complete feat data structure from 5etools JSON
 */
export interface EtoolsFeat extends EtoolsSource {
  name: string;
  prerequisite?: EtoolsFeatPrerequisite;
  ability?: EtoolsFeatAbilityScoreImprovement[];
  entries: EtoolsEntry[];
  
  // Additional benefits
  skillProficiencies?: Array<{
    choose?: {
      from: string[];
      count?: number;
    };
  } & Record<string, boolean | undefined>>;
  
  languageProficiencies?: Array<{
    choose?: {
      from: string[];
      count?: number;
    };
  } & Record<string, boolean | undefined>>;
  
  toolProficiencies?: Array<{
    choose?: {
      from: string[];
      count?: number;
    };
  } & Record<string, boolean | undefined>>;
  
  armorProficiencies?: Array<{
    light?: boolean;
    medium?: boolean;
    heavy?: boolean;
    shield?: boolean;
  }>;
  
  weaponProficiencies?: Array<{
    simple?: boolean;
    martial?: boolean;
    [weapon: string]: boolean | undefined;
  }>;
  
  expertise?: Array<{
    choose?: {
      from: string[];
      count?: number;
    };
  } & Record<string, boolean | undefined>>;
  
  additionalSpells?: Array<{
    known?: {
      [level: string]: string[];
    };
    prepared?: {
      [level: string]: string[];
    };
    expanded?: {
      [level: string]: string[];
    };
    ability?: EtoolsAbility;
    innate?: {
      [frequency: string]: {
        [spell: string]: string[];
      };
    };
  }>;
  
  // Feat categories and metadata
  category?: string;
  
  // Repeatable feat
  repeatable?: boolean;
  repeatableNote?: string;
  
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
  
  // Special feat types
  foundrySystem?: Record<string, unknown>;
  foundryFlags?: Record<string, unknown>;
  foundryEffects?: Array<Record<string, unknown>>;
  foundryImg?: string;
  
  // Legacy fields that might appear
  type?: string;
}

/**
 * Feat list data structure (root of feat JSON files)
 */
export interface EtoolsFeatData {
  feat: EtoolsFeat[];
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