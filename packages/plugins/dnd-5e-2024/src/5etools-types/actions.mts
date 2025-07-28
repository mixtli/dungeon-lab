/**
 * 5etools action type definitions
 */
import type { EtoolsEntry } from './base.mjs';

export interface EtoolsActionTime {
  number: number;
  unit: 'action' | 'bonus' | 'reaction' | 'minute' | 'hour' | 'round';
  condition?: string;
}

export interface EtoolsAction {
  name: string;
  source: string;
  page?: number;
  entries: EtoolsEntry[];
  time?: EtoolsActionTime[];
  srd?: boolean;
  basicRules?: boolean;
  srd52?: boolean;
  basicRules2024?: boolean;
  otherSources?: Array<{
    source: string;
    page: number;
  }>;
  reprintedAs?: string[];
  /** Some actions may have additional properties */
  fromVariant?: string;
  [key: string]: unknown;
}

export interface EtoolsActionData {
  action: EtoolsAction[];
}