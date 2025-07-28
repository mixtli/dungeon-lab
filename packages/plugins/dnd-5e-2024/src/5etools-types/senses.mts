/**
 * 5etools sense type definitions
 */
import type { EtoolsEntry } from './base.mjs';

export interface EtoolsSense {
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
  /** Some senses may have additional mechanics properties */
  [key: string]: unknown;
}

export interface EtoolsSenseData {
  sense: EtoolsSense[];
}