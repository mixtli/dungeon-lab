import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';

/**
 * D&D 5e 2024 Language Runtime Types
 * 
 * Simplified schema based on actual XPHB (2024) source data.
 * No artificial/hardcoded data - only what's actually in 5etools XPHB entries.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Language runtime data schema
 * Based on actual XPHB 2024 data structure
 */
export const dndLanguageDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** 2024: Language category (standard vs rare) from XPHB type field */
  category: z.enum(['standard', 'rare']),
  
  /** Origin extracted from entries field (e.g., "Origin: Demons of the Abyss.") */
  origin: z.string().optional(),
  
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Language document schema (runtime)
 * Extends base VTT document with language-specific plugin data
 */
export const dndLanguageDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('language'),
  pluginData: dndLanguageDataSchema
});

/**
 * Runtime type exports
 */
export type DndLanguageData = z.infer<typeof dndLanguageDataSchema>;
export type DndLanguageDocument = z.infer<typeof dndLanguageDocumentSchema>;

