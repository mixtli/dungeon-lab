/**
 * 5etools variant rule type definitions
 */
import { z } from 'zod';
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

// Zod schemas for validation

export const etoolsRuleTypeSchema = z.enum(['C', 'O', 'V', 'VO']);

export const etoolsVariantRuleSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  ruleType: etoolsRuleTypeSchema,
  entries: z.array(z.any()),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  otherSources: z.array(z.object({
    source: z.string(),
    page: z.number()
  })).optional(),
  reprintedAs: z.array(z.string()).optional(),
  type: z.enum(['section', 'entries', 'inset', 'insetReadaloud']).optional()
}).passthrough();

export const etoolsVariantRuleDataSchema = z.object({
  variantrule: z.array(etoolsVariantRuleSchema)
}).passthrough();