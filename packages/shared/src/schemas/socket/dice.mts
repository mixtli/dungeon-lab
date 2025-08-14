import { z } from 'zod';
import { baseSocketCallbackSchema } from './base-callback.schema.mjs';
import {
  rollResultSchema,
  enhancedRollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  enhancedRollResponseSchema
} from '../dice.schema.mjs';

// ============================================================================
// SOCKET DICE ROLLING SCHEMAS
// ============================================================================

// Re-export dice schemas for socket events
export {
  rollResultSchema,
  enhancedRollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  enhancedRollResponseSchema
};

export const rollCallbackSchema = baseSocketCallbackSchema;

// ============================================================================
// CLIENT-TO-SERVER EVENT SCHEMAS
// ============================================================================

export const rollArgsSchema = z.tuple([
  rollRequestSchema,
  z.function().args(rollCallbackSchema)
]); 