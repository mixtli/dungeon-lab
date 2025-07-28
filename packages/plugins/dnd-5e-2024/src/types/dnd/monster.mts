import { z } from 'zod';
import { dndStatBlockSchema } from './stat-block.mjs';

/**
 * D&D 5e Monster Runtime Types
 * 
 * Monster schema that extends the stat block with monster-specific information.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Monster-specific fields that extend the base stat block
 */
export const dndMonsterSpecificSchema = z.object({
  // Environment and ecology
  environment: z.array(z.string()).optional(),
  
  // Tags for organization and filtering
  tags: z.array(z.string()).optional(),
  
  // Additional monster-specific metadata
  description: z.string().optional()
});

/**
 * D&D Monster runtime data schema
 * This extends the stat block with monster-specific fields
 */
export const dndMonsterDataSchema = dndStatBlockSchema.merge(dndMonsterSpecificSchema);

/**
 * D&D Monster document schema (runtime)
 */
// Note: Monster documents should use the standard actorSchema from shared
// This is just the plugin data schema
export const dndMonsterDocumentSchema = dndMonsterDataSchema;

/**
 * Runtime type exports
 */
export type DndMonsterData = z.infer<typeof dndMonsterDataSchema>;
export type DndMonsterDocument = z.infer<typeof dndMonsterDocumentSchema>;

/**
 * Monster size identifiers
 */
export const monsterSizeIdentifiers = [
  'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'
] as const;

export type MonsterSizeIdentifier = typeof monsterSizeIdentifiers[number];