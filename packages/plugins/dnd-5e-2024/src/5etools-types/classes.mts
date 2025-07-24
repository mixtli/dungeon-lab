/**
 * TypeScript definitions for 5etools class data structures
 */
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsAbility,
  EtoolsChoice
} from './base.mjs';

/**
 * Hit die specification for classes
 */
export interface EtoolsClassHitDie {
  faces: number;
  number?: number;
}

/**
 * Proficiency specification
 */
export interface EtoolsClassProficiencies {
  armor?: string[];
  weapons?: string[];
  tools?: (string | EtoolsChoice<string>)[];
  skills?: (string | EtoolsChoice<string>)[];
  skillsPoints?: number;
}

/**
 * Starting equipment specification
 */
export interface EtoolsStartingEquipment {
  additionalFromBackground?: boolean;
  default?: string[];
  goldAlternative?: string;
  defaultData?: Array<{
    _?: string;
    a?: string[];
    b?: string[];
    equipmentType?: string;
  }>;
}

/**
 * Class feature specification
 */
export interface EtoolsClassFeature extends EtoolsSource {
  name: string;
  level: number;
  entries?: EtoolsEntry[];
  isClassFeatureVariant?: boolean;
  className?: string;
  classSource?: string;
  subclassShortName?: string;
  subclassSource?: string;
  gainSubclassFeature?: boolean;
  benefits?: unknown[];
}

/**
 * Subclass specification
 */
export interface EtoolsSubclass extends EtoolsSource {
  name: string;
  shortName: string;
  className: string;
  classSource: string;
  subclassFeatures: string[];
  subclassTableGroups?: Array<{
    title: string;
    subclasses: Array<{
      name: string;
      source: string;
    }>;
    tables?: Array<{
      title?: string;
      colLabels: string[];
      rows: (string | number)[][];
    }>;
  }>;
}

/**
 * Multiclassing requirements and benefits
 */
export interface EtoolsMulticlassing {
  requirements?: Record<EtoolsAbility, number>;
  proficienciesGained?: EtoolsClassProficiencies;
}

/**
 * Complete class data structure from 5etools JSON
 */
export interface EtoolsClass extends EtoolsSource {
  name: string;
  hd: EtoolsClassHitDie;
  proficiency: EtoolsAbility[];
  startingProficiencies: EtoolsClassProficiencies;
  startingEquipment?: EtoolsStartingEquipment;
  primaryAbility?: (EtoolsAbility | EtoolsChoice<EtoolsAbility>)[];
  classTableGroups?: Array<{
    title?: string;
    subclasses?: Array<{
      name: string;
      source: string;
    }>;
    colLabels: string[];
    rows: (string | number | { type: string; colSpan?: number })[][];
    rowsSpellProgression?: Array<{
      [key: string]: number | string;
    }>;
  }>;
  classFeatures?: string[];
  classFeature?: EtoolsClassFeature[];
  subclassTitle: string;
  subclasses?: EtoolsSubclass[];
  multiclassing?: EtoolsMulticlassing;
  
  // Optional metadata
  casterProgression?: 'full' | 'half' | '1/3' | 'pact';
  spellcastingAbility?: EtoolsAbility;
  cantripProgression?: number[];
  spellsKnownProgression?: number[];
  spellsKnownProgressionFixed?: Record<string, number[]>;
  spellsKnownProgressionFixedAllowLowerLevel?: boolean;
  spellsKnownProgressionFixedByLevel?: Record<string, Record<string, number>>;
  
  // Variant and reprint information
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  
  // Additional fields that may appear
  requirements?: string;
  additionalSpells?: Array<{
    known?: Record<string, string[]>;
    prepared?: Record<string, string[]>;
    expanded?: Record<string, string[]>;
  }>;
  
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
 * Class fluff data structure
 */
export interface EtoolsClassFluff extends EtoolsSource {
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
 * Class list data structure (root of class JSON files)
 */
export interface EtoolsClassData {
  class?: EtoolsClass[];
  classFeature?: EtoolsClassFeature[];
  subclass?: EtoolsSubclass[];
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
 * Class fluff data structure (fluff files)
 */
export interface EtoolsClassFluffData {
  classFluff?: EtoolsClassFluff[];
  subclassFluff?: Array<EtoolsClassFluff & {
    className: string;
    classSource: string;
    subclassShortName: string;
  }>;
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