/**
 * 5etools sense type definitions
 */
import { z } from 'zod';
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

/**
 * Zod schema for 5etools sense data validation
 */
export const etoolsSenseSchema = z.object({
  // Basic identification
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  
  // Content
  entries: z.array(z.any()),
  
  // Publication flags
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  
  // Source information
  otherSources: z.array(z.object({
    source: z.string(),
    page: z.number()
  })).optional(),
  reprintedAs: z.array(z.string()).optional(),
  
  // Additional mechanics properties (allow any additional properties)
}).passthrough();