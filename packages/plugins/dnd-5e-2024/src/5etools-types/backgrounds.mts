/**
 * TypeScript definitions for 5etools background data structures
 */
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsChoice
} from './base.mjs';

/**
 * Background skill proficiency specification
 */
export interface EtoolsBackgroundSkills {
  choose?: EtoolsChoice<string>;
  [skill: string]: boolean | EtoolsChoice<string> | undefined;
}

/**
 * Background language proficiency specification
 */
export interface EtoolsBackgroundLanguages {
  choose?: EtoolsChoice<string>;
  [language: string]: boolean | EtoolsChoice<string> | undefined;
}

/**
 * Background tool proficiency specification
 */
export interface EtoolsBackgroundToolProficiencies {
  choose?: EtoolsChoice<string>;
  [tool: string]: boolean | EtoolsChoice<string> | undefined;
}

/**
 * Equipment item specification for 2024 D&D backgrounds
 */
export interface EtoolsEquipmentItem {
  item?: string;
  displayName?: string;
  quantity?: number;
  value?: number; // gold pieces
  special?: string; // special items like "vestments"
  containsValue?: number; // for pouches with gold
}

/**
 * Background starting equipment specification for 2024 D&D
 */
export interface EtoolsBackgroundStartingEquipment {
  _?: (string | EtoolsEquipmentItem)[];
  A?: (string | EtoolsEquipmentItem)[]; // Choice option A
  B?: (string | EtoolsEquipmentItem)[]; // Choice option B
  a?: (string | EtoolsEquipmentItem)[]; // legacy lowercase
  b?: (string | EtoolsEquipmentItem)[]; // legacy lowercase
  c?: (string | EtoolsEquipmentItem)[];
  d?: (string | EtoolsEquipmentItem)[];
  e?: (string | EtoolsEquipmentItem)[];
}

/**
 * Background feature specification
 */
export interface EtoolsBackgroundFeature {
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Ability score improvement specification for 2024 D&D backgrounds
 */
export interface EtoolsAbilityScoreImprovement {
  choose: {
    weighted: {
      from: string[]; // ability scores like ['int', 'wis', 'cha']
      weights: number[]; // point distribution like [2, 1] or [1, 1, 1]
    };
  };
}

/**
 * Background feat specification for 2024 D&D
 */
export interface EtoolsBackgroundFeats {
  [featName: string]: boolean; // e.g., "magic initiate; cleric|xphb": true
}

/**
 * Complete background data structure from 5etools JSON
 */
export interface EtoolsBackground extends EtoolsSource {
  name: string;
  
  // 2024 D&D additions
  ability?: EtoolsAbilityScoreImprovement[]; // ability score improvements
  feats?: EtoolsBackgroundFeats[]; // background feats
  edition?: string; // "one" for 2024 edition
  
  // Standard proficiencies
  skillProficiencies?: EtoolsBackgroundSkills[];
  languageProficiencies?: EtoolsBackgroundLanguages[];
  toolProficiencies?: EtoolsBackgroundToolProficiencies[];
  startingEquipment?: EtoolsBackgroundStartingEquipment[];
  entries?: EtoolsEntry[];
  feature?: EtoolsBackgroundFeature;
  featureText?: EtoolsEntry[];
  
  // Variant features
  additionalFeatures?: EtoolsBackgroundFeature[];
  
  // Personality traits, ideals, bonds, flaws
  personalityTraits?: {
    entries: EtoolsEntry[];
    _?: string[];
  };
  ideals?: {
    entries: EtoolsEntry[];
    _?: string[];
  };
  bonds?: {
    entries: EtoolsEntry[];
    _?: string[];
  };
  flaws?: {
    entries: EtoolsEntry[];
    _?: string[];
  };
  
  // Suggested characteristics tables
  suggestedCharacteristics?: EtoolsEntry[];
  
  // Variant rules
  variants?: Array<{
    name: string;
    entries: EtoolsEntry[];
    skillProficiencies?: EtoolsBackgroundSkills[];
    languageProficiencies?: EtoolsBackgroundLanguages[];
    toolProficiencies?: EtoolsBackgroundToolProficiencies[];
    startingEquipment?: EtoolsBackgroundStartingEquipment[];
    feature?: EtoolsBackgroundFeature;
    source?: string;
    page?: number;
  }>;
  
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
}

/**
 * Background list data structure (root of background JSON files)
 */
export interface EtoolsBackgroundData {
  background: EtoolsBackground[];
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