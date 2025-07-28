/**
 * 5etools variant rule type definitions
 */
import type { EtoolsEntry } from './base.mjs';

export type EtoolsRuleType = 'C' | 'O' | 'V' | 'VO';

export interface EtoolsVariantRule {
  name: string;
  source: string;
  page?: number;
  ruleType: EtoolsRuleType;
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
  type?: 'section' | 'entries' | 'inset' | 'insetReadaloud';
  /** Some rules may have additional metadata */
  [key: string]: unknown;
}

export interface EtoolsVariantRuleData {
  variantrule: EtoolsVariantRule[];
}