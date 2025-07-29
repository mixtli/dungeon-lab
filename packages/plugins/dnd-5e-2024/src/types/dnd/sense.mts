import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';

/**
 * D&D 5e 2024 Sense Runtime Types
 * 
 * Simplified schema based on actual XPHB (2024) source data.
 * No artificial/hardcoded data - only what's actually in 5etools XPHB entries.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * D&D Sense runtime data schema
 * Based on actual XPHB 2024 data structure
 */
export const dndSenseDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Sense document schema (runtime)
 * Extends base VTT document with sense-specific plugin data
 */
export const dndSenseDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('sense'),
  pluginData: dndSenseDataSchema
});

/**
 * Runtime type exports
 */
export type DndSenseData = z.infer<typeof dndSenseDataSchema>;
export type DndSenseDocument = z.infer<typeof dndSenseDocumentSchema>;