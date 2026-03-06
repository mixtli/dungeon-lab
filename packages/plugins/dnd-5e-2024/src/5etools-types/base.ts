/**
 * Base types for 5etools JSON data structures
 */

/**
 * Common source reference found in most 5etools entities
 */
export interface EtoolsSource {
  source: string;
  page?: number;
  srd52?: boolean;
}

/**
 * Entry types that can appear in 5etools entries arrays
 * Based on 2024 XPHB data patterns
 */
export type EtoolsEntry = 
  | string
  | EtoolsEntryTable
  | EtoolsEntryList
  | EtoolsEntryQuote
  | EtoolsEntryInlineEntries
  | EtoolsEntryEntries
  | EtoolsEntryItem;

export interface EtoolsEntryTable {
  type: 'table';
  caption?: string;
  colLabels?: string[];
  colStyles?: string[];
  rows: (string | EtoolsEntry)[][];
}

export interface EtoolsEntryList {
  type: 'list';
  style?: 'list-hang-notitle' | 'list-no-bullets';
  items: EtoolsEntry[];
}

export interface EtoolsEntryQuote {
  type: 'quote';
  entries: EtoolsEntry[];
  by?: string;
  from?: string;
}

export interface EtoolsEntryInlineEntries {
  type: 'inlineEntries';
  entries: EtoolsEntry[];
}

export interface EtoolsEntryEntries {
  type: 'entries';
  name?: string;
  entries: EtoolsEntry[];
}

export interface EtoolsEntryItem {
  type: 'item';
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Distance specification used in ranges, movement speeds, etc.
 */
export interface EtoolsDistance {
  type: 'feet' | 'miles' | 'self' | 'touch' | 'sight' | 'unlimited';
  amount?: number;
}

/**
 * Time specification used in casting times, durations, etc.
 * Enhanced for 2024 data patterns
 */
export interface EtoolsTime {
  number: number;
  unit: 'action' | 'bonus' | 'reaction' | 'minute' | 'hour' | 'day' | 'round' | 'turn';
  condition?: string;
}

/**
 * Duration specification for spells and effects
 * Enhanced for 2024 data patterns
 */
export interface EtoolsDuration {
  type: 'instant' | 'timed' | 'permanent' | 'special';
  duration?: {
    type: 'minute' | 'hour' | 'day' | 'round' | 'turn';
    amount: number;
  };
  concentration?: boolean;
  ends?: string[];
}

/**
 * Class reference format used in spells and other features
 */
export interface EtoolsClassReference {
  name: string;
  source: string;
  definedInSource?: string;
}

/**
 * Ability score reference
 */
export type EtoolsAbility = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

/**
 * Common choice format used throughout 5etools data
 */
export interface EtoolsChoice<T = string> {
  choose: {
    from: T[];
    count?: number;
  };
}

/**
 * Utility type for entities that can be either a string or an object with a name
 */
export type EtoolsNamedEntity = string | { name: string; [key: string]: unknown };