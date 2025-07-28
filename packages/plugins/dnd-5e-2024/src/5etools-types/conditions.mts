/**
 * 5etools condition type definitions
 */
import type { EtoolsEntry } from './base.mjs';

export interface EtoolsCondition {
  name: string;
  source: string;
  page?: number;
  entries: EtoolsEntry[];
  srd?: boolean;
  basicRules?: boolean;
  srd52?: boolean;
  basicRules2024?: boolean;
  otherSources?: Array<{
    source: string;
    page: number;
  }>;
  reprintedAs?: string[];
  /** Some conditions may have additional properties for specific mechanics */
  [key: string]: unknown;
}

export interface EtoolsConditionData {
  condition: EtoolsCondition[];
  disease?: EtoolsCondition[]; // diseases are in the same file
}

export interface EtoolsDisease {
  name: string;
  source: string;
  page?: number;
  entries: EtoolsEntry[];
  srd?: boolean;
  basicRules?: boolean;
  diseaseType?: string;
  [key: string]: unknown;
}