/**
 * 5etools action type definitions
 */
import { z } from 'zod';
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

// Zod schemas for validation

export const etoolsActionTimeSchema = z.object({
  number: z.number(),
  unit: z.enum(['action', 'bonus', 'reaction', 'minute', 'hour', 'round']),
  condition: z.string().optional()
}).passthrough();

export const etoolsActionSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  entries: z.array(z.any()),
  time: z.array(z.union([etoolsActionTimeSchema, z.string()])).optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  otherSources: z.array(z.object({
    source: z.string(),
    page: z.number()
  })).optional(),
  reprintedAs: z.array(z.string()).optional(),
  fromVariant: z.string().optional()
}).passthrough();

export const etoolsActionDataSchema = z.object({
  action: z.array(etoolsActionSchema)
}).passthrough();