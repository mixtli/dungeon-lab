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
 * Background starting equipment specification
 */
export interface EtoolsBackgroundStartingEquipment {
  _?: string[];
  a?: string[];
  b?: string[];
  c?: string[];
  d?: string[];
  e?: string[];
}

/**
 * Background feature specification
 */
export interface EtoolsBackgroundFeature {
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Complete background data structure from 5etools JSON
 */
export interface EtoolsBackground extends EtoolsSource {
  name: string;
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