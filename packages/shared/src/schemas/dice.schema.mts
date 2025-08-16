import { z } from 'zod';

// ============================================================================
// DICE ROLLING SCHEMAS
// ============================================================================

/**
 * Individual dice group within a formula (e.g., "2d20" or "3d4")
 */
export const diceGroupSchema = z.object({
  count: z.number().min(1).max(100),
  die: z.number().refine((val) => [4, 6, 8, 10, 12, 20, 100].includes(val), {
    message: 'Die must be one of: d4, d6, d8, d10, d12, d20, d100'
  }),
  results: z.array(z.number().min(1))
});

/**
 * Parsed dice formula breakdown
 */
export const parsedDiceFormulaSchema = z.object({
  diceGroups: z.array(diceGroupSchema),
  modifier: z.number(),
  originalFormula: z.string()
});

/**
 * Legacy roll result schema (maintained for backward compatibility)
 */
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
  userId: z.string(),
  timestamp: z.date().optional()
});


/**
 * Configuration options for 3D dice rendering
 */
export const dice3DOptionsSchema = z.object({
  assetPath: z.string(),
  theme: z.string(),
  offscreen: z.boolean(),
  transparent: z.boolean(),
  shadows: z.boolean(),
  lightIntensity: z.number().min(0).max(1),
  soundEnabled: z.boolean()
});

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

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


// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type DiceGroup = z.infer<typeof diceGroupSchema>;
export type ParsedDiceFormula = z.infer<typeof parsedDiceFormulaSchema>;
export type RollResult = z.infer<typeof rollResultSchema>;
export type Dice3DOptions = z.infer<typeof dice3DOptionsSchema>;
export type DiceRollRequest = z.infer<typeof diceRollRequestSchema>;
export type DiceRollResponse = z.infer<typeof diceRollResponseSchema>;
export type RollRequest = z.infer<typeof rollRequestSchema>;
export type RollResponse = z.infer<typeof rollResponseSchema>;