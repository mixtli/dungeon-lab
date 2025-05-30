import { z } from 'zod';

// ============================================================================
// DICE ROLLING SCHEMAS
// ============================================================================

export const rollResultSchema = z.object({
  formula: z.string(),
  rolls: z.array(
    z.object({
      die: z.number(),
      result: z.number()
    })
  ),
  total: z.number(),
  modifier: z.number().optional(),
  userId: z.string()
});

export const diceRollRequestSchema = z.object({
  formula: z.string(),
  gameSessionId: z.string().optional()
});

export const diceRollResponseSchema = z.object({
  formula: z.string(),
  gameSessionId: z.string().optional(),
  result: rollResultSchema,
  userId: z.string()
});

export const rollRequestSchema = z.object({
  formula: z.string(),
  gameSessionId: z.string()
});

export const rollResponseSchema = z.object({
  type: z.literal('roll-result'),
  result: rollResultSchema,
  gameSessionId: z.string()
});

export const rollCallbackSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

// ============================================================================
// CLIENT-TO-SERVER EVENT SCHEMAS
// ============================================================================

export const rollArgsSchema = z.tuple([
  rollRequestSchema,
  z.function().args(rollCallbackSchema)
]); 