/**
 * 5etools language type definitions
 */
import type { EtoolsEntry } from './base.mjs';

export type EtoolsLanguageType = 'standard' | 'exotic' | 'secret';

export interface EtoolsLanguage {
  name: string;
  source: string;
  page?: number;
  type?: EtoolsLanguageType;
  typicalSpeakers?: string[];
  script?: string;
  entries?: EtoolsEntry[];
  srd?: boolean;
  basicRules?: boolean;
  srd52?: boolean;
  basicRules2024?: boolean;
  otherSources?: Array<{
    source: string;
    page: number;
  }>;
  reprintedAs?: string[];
  /** Some languages may have additional properties */
  fonts?: string[];
  [key: string]: unknown;
}

export interface EtoolsLanguageData {
  language: EtoolsLanguage[];
}