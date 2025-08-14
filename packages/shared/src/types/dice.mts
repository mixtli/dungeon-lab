import {
  diceGroupSchema,
  parsedDiceFormulaSchema,
  rollResultSchema,
  enhancedRollResultSchema,
  dice3DOptionsSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  enhancedRollResponseSchema,
  type DiceGroup,
  type ParsedDiceFormula,
  type RollResult,
  type EnhancedRollResult,
  type Dice3DOptions,
  type DiceRollRequest,
  type DiceRollResponse,
  type RollRequest,
  type RollResponse,
  type EnhancedRollResponse
} from '../schemas/dice.schema.mjs';

// ============================================================================
// DICE TYPES FOR 3D DICE ROLLING
// ============================================================================

/**
 * Dice box instance interface for ThreeJS dice
 */
export interface DiceBoxInstance {
  init(): Promise<void>;
  roll(notation: string): Promise<void>;
  clear(): void;
  destroy(): void;
}

// ============================================================================
// RE-EXPORT TYPES FROM SCHEMAS
// ============================================================================

export type {
  DiceGroup,
  ParsedDiceFormula,
  RollResult,
  EnhancedRollResult,
  Dice3DOptions,
  DiceRollRequest,
  DiceRollResponse,
  RollRequest,
  RollResponse,
  EnhancedRollResponse
};

// ============================================================================
// RE-EXPORT SCHEMAS FOR VALIDATION
// ============================================================================

export {
  diceGroupSchema,
  parsedDiceFormulaSchema,
  rollResultSchema,
  enhancedRollResultSchema,
  dice3DOptionsSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  enhancedRollResponseSchema
};