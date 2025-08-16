import {
  diceGroupSchema,
  parsedDiceFormulaSchema,
  rollResultSchema,
  dice3DOptionsSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  type DiceGroup,
  type ParsedDiceFormula,
  type RollResult,
  type Dice3DOptions,
  type DiceRollRequest,
  type DiceRollResponse,
  type RollRequest,
  type RollResponse
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
  Dice3DOptions,
  DiceRollRequest,
  DiceRollResponse,
  RollRequest,
  RollResponse
};

// ============================================================================
// RE-EXPORT SCHEMAS FOR VALIDATION
// ============================================================================

export {
  diceGroupSchema,
  parsedDiceFormulaSchema,
  rollResultSchema,
  dice3DOptionsSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema
};