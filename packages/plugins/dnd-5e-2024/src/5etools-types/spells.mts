/**
 * TypeScript definitions for 5etools spell data structures
 */
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsTime, 
  EtoolsDistance, 
  EtoolsDuration,
  EtoolsClassReference
} from './base.mjs';

/**
 * Spell school abbreviations used in 5etools data
 */
export type EtoolsSpellSchool = 'A' | 'C' | 'D' | 'E' | 'I' | 'N' | 'T' | 'V';

/**
 * Spell range specification
 */
export interface EtoolsSpellRange {
  type: 'point' | 'line' | 'cone' | 'cube' | 'sphere' | 'hemisphere' | 'cylinder';
  distance: EtoolsDistance;
}

/**
 * Spell components specification
 * Enhanced for 2024 data patterns
 */
export interface EtoolsSpellComponents {
  v?: boolean; // Verbal
  s?: boolean; // Somatic
  m?: boolean | string | { // Material
    text?: string;
    cost?: number;
    consume?: boolean;
  };
  r?: boolean; // Ritual (alternative location for ritual flag)
}

/**
 * Spell metadata for special properties
 */
export interface EtoolsSpellMeta {
  ritual?: boolean;
  concentration?: boolean;
}

/**
 * Classes that can cast a spell
 */
export interface EtoolsSpellClasses {
  fromClassList?: EtoolsClassReference[];
  fromClassListVariant?: EtoolsClassReference[];
  fromSubclass?: Array<{
    class: EtoolsClassReference;
    subclass: EtoolsClassReference;
  }>;
}

/**
 * Scaling information for spells cast at higher levels
 */
export interface EtoolsSpellScaling {
  '1'?: EtoolsEntry[];
  '2'?: EtoolsEntry[];
  '3'?: EtoolsEntry[];
  '4'?: EtoolsEntry[];
  '5'?: EtoolsEntry[];
  '6'?: EtoolsEntry[];
  '7'?: EtoolsEntry[];
  '8'?: EtoolsEntry[];
  '9'?: EtoolsEntry[];
}

/**
 * Scaling level dice information for cantrips and spells
 * New in 2024 data
 */
export interface EtoolsScalingLevelDice {
  label?: string;
  scaling: {
    '1'?: string;
    '5'?: string;
    '11'?: string;
    '17'?: string;
    [level: string]: string | undefined;
  };
}

/**
 * Complete spell data structure from 5etools JSON
 */
export interface EtoolsSpell extends EtoolsSource {
  name: string;
  level: number;
  school: EtoolsSpellSchool;
  time: EtoolsTime[];
  range: EtoolsSpellRange;
  components: EtoolsSpellComponents;
  duration: EtoolsDuration[];
  entries: EtoolsEntry[];
  entriesHigherLevel?: EtoolsEntry[];
  classes: EtoolsSpellClasses;
  meta?: EtoolsSpellMeta;
  
  // Optional fields that may appear in spell data
  damageInflict?: string[];
  conditionInflict?: string[];
  savingThrow?: string[];
  spellAttack?: string[];
  
  // Scaling information
  scalingLevelDice?: EtoolsScalingLevelDice;
  
  // Variant and reprint information
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  
  // Additional metadata
  affectsCreatureType?: string[];
  timelineTags?: string[];
  
  // 2024-specific metadata
  basicRules2024?: boolean;
  miscTags?: string[];
  areaTags?: string[];
  
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
 * Spell list data structure (root of spells JSON files)
 */
export interface EtoolsSpellData {
  spell: EtoolsSpell[];
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