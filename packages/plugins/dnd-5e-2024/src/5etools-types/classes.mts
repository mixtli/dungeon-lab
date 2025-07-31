/**
 * TypeScript definitions for 5etools class data structures
 */
import { z } from 'zod';
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
  entries?: string[];
  defaultData?: Array<{
    _?: string;
    A?: Array<{ item?: string; quantity?: number; value?: number }>;
    B?: Array<{ item?: string; quantity?: number; value?: number }>;
    C?: Array<{ item?: string; quantity?: number; value?: number }>;
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
  entries?: EtoolsEntry[];
  additionalSpells?: Array<{
    known?: Record<string, string[]>;
    prepared?: Record<string, string[]>;
    expanded?: Record<string, string[]>;
    innate?: Record<string, Record<string, string[]>>;
  }>;
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
    innate?: Record<string, Record<string, string[]>>;
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

// Zod schemas for validation

export const etoolsClassHitDieSchema = z.object({
  faces: z.number(),
  number: z.number().optional()
}).passthrough();

export const etoolsClassProficienciesSchema = z.object({
  armor: z.array(z.union([z.string(), z.any()])).optional(),
  weapons: z.array(z.union([z.string(), z.any()])).optional(),
  tools: z.array(z.union([z.string(), z.any()])).optional(),
  skills: z.array(z.union([z.string(), z.any()])).optional(),
  skillsPoints: z.number().optional()
}).passthrough();

export const etoolsStartingEquipmentSchema = z.object({
  additionalFromBackground: z.boolean().optional(),
  default: z.array(z.string()).optional(),
  goldAlternative: z.string().optional(),
  entries: z.array(z.string()).optional(),
  defaultData: z.array(z.any()).optional()
}).passthrough();

export const etoolsClassFeatureSchema = z.object({
  name: z.string(),
  level: z.number(),
  source: z.string(),
  page: z.number().optional(),
  entries: z.array(z.any()).optional(),
  header: z.number().optional(),
  consumes: z.any().optional()
}).passthrough();

export const etoolsSubclassSchema = z.object({
  name: z.string(),
  shortName: z.string(),
  source: z.string(),
  page: z.number().optional(),
  className: z.string(),
  classSource: z.string(),
  subclassFeatures: z.array(etoolsClassFeatureSchema).optional(),
  entries: z.array(z.any()).optional(),
  additionalSpells: z.array(z.any()).optional()
}).passthrough();

export const etoolsClassSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  hd: etoolsClassHitDieSchema.optional(),  
  primaryAbility: z.array(z.union([z.string(), z.any()])).optional(),
  proficiency: z.array(z.string()).optional(),
  startingProficiencies: etoolsClassProficienciesSchema.optional(),
  startingEquipment: etoolsStartingEquipmentSchema.optional(),
  classFeature: z.array(etoolsClassFeatureSchema).optional(),
  classFeatures: z.array(z.union([z.string(), z.any()])).optional(),
  subclasses: z.array(etoolsSubclassSchema).optional(),
  casterProgression: z.string().optional(),
  spellcastingAbility: z.string().optional(),
  cantripProgression: z.array(z.number()).optional(),
  spellsKnownProgression: z.array(z.number()).optional(),
  additionalSpells: z.array(z.any()).optional(),
  preparedSpells: z.string().optional(),
  multiclassing: z.any().optional(),
  requirements: z.any().optional(),
  fluff: z.array(z.any()).optional()
}).passthrough();

export const etoolsClassDataSchema = z.object({
  class: z.array(etoolsClassSchema)
}).passthrough();

export const etoolsClassFluffSchema = z.object({
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

export const etoolsClassFluffDataSchema = z.object({
  classFluff: z.array(etoolsClassFluffSchema).optional(),
  subclassFluff: z.array(etoolsClassFluffSchema.extend({
    className: z.string(),
    classSource: z.string(),
    subclassShortName: z.string()
  })).optional()
}).passthrough();