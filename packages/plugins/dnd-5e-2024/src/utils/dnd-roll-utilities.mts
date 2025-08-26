/**
 * D&D Roll Calculation Utilities
 * 
 * Common utility functions for D&D roll processing, eliminating code duplication
 * across different roll handlers (ability checks, attacks, saves, etc.).
 */

import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { ProcessedRollResult } from '@dungeon-lab/shared/interfaces/processed-roll-result.interface.mjs';

/**
 * Calculate the final total for a D&D d20-based roll with proper advantage/disadvantage logic
 * 
 * This handles the core D&D mechanic where:
 * - Advantage: Roll 2d20, take the higher result
 * - Disadvantage: Roll 2d20, take the lower result  
 * - Normal: Roll 1d20 (or just take the first die if 2 were rolled)
 * 
 * Also adds all modifiers and custom modifiers to the final total.
 */
export function calculateD20Total(result: RollServerResult): number {
  let total = 0;
  
  // Handle advantage/disadvantage for d20 rolls
  for (const diceGroup of result.results) {
    if (diceGroup.sides === 20 && diceGroup.results.length === 2) {
      const advantageMode = result.arguments.pluginArgs?.advantageMode;
      if (advantageMode === 'advantage') {
        total += Math.max(...diceGroup.results);
      } else if (advantageMode === 'disadvantage') {
        total += Math.min(...diceGroup.results);
      } else {
        // Normal case with 2 dice - just take the first one
        total += diceGroup.results[0];
      }
    } else {
      // Regular dice (damage dice, single d20, etc.) - sum normally
      total += diceGroup.results.reduce((sum, res) => sum + res, 0);
    }
  }

  // Add modifiers
  for (const modifier of result.modifiers) {
    total += modifier.value;
  }

  // Add custom modifier
  total += result.arguments.customModifier;

  return total;
}

/**
 * Check if a d20 roll is a critical hit (natural 20)
 * 
 * Used for attack rolls to determine critical hits.
 * Returns true if any d20 in the roll shows a natural 20.
 */
export function isCriticalHit(result: RollServerResult): boolean {
  return result.results.some(diceGroup => 
    diceGroup.sides === 20 && diceGroup.results.some(roll => roll === 20)
  );
}

/**
 * Check if a d20 roll is a critical failure (natural 1)
 * 
 * Used for attack rolls and saving throws to determine critical failures.
 * Returns true if any d20 in the roll shows a natural 1.
 */
export function isCriticalFailure(result: RollServerResult): boolean {
  return result.results.some(diceGroup => 
    diceGroup.sides === 20 && diceGroup.results.some(roll => roll === 1)
  );
}

/**
 * Format advantage mode for display in roll descriptions
 * 
 * @param advantageMode - The advantage mode from roll arguments
 * @returns Formatted string for display (e.g., " (Advantage)", " (Disadvantage)", "")
 */
export function formatAdvantageMode(advantageMode?: string): string {
  if (advantageMode === 'advantage') {
    return ' (Advantage)';
  } else if (advantageMode === 'disadvantage') {
    return ' (Disadvantage)';
  }
  return '';
}

/**
 * Create a complete roll description with advantage/disadvantage formatting
 * 
 * @param baseDescription - The base roll description (e.g., "Strength Check", "Fire Bolt Attack")
 * @param advantageMode - The advantage mode from roll arguments
 * @returns Complete formatted description
 */
export function createRollDescription(baseDescription: string, advantageMode?: string): string {
  return baseDescription + formatAdvantageMode(advantageMode);
}

/**
 * Format skill name from hyphenated format to title case
 * 
 * @param skill - Skill name in hyphenated format (e.g., "animal-handling")
 * @returns Formatted skill name (e.g., "Animal Handling")
 */
export function formatSkillName(skill: string): string {
  return skill.split('-').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Create a complete chat message for a D&D roll
 * 
 * @param characterName - Name of the character making the roll
 * @param rollDescription - Description of the roll (should include advantage/disadvantage)
 * @param total - The final calculated total
 * @returns Formatted chat message
 */
export function createRollMessage(characterName: string | undefined, rollDescription: string, total: number): string {
  return `${characterName ? `${characterName} rolled ` : ''}${rollDescription}: **${total}**`;
}

/**
 * Generic D20 roll processing function
 * 
 * Handles common processing for all D&D d20-based rolls:
 * - Calculates total with advantage/disadvantage
 * - Detects critical hits (if applicable)
 * - Creates augmented roll result
 * - Returns standardized ProcessedRollResult
 * 
 * @param result - The raw roll result from the server
 * @param handlerType - The type of handler (for logging/debugging)
 * @param options - Configuration options for the processing
 */
export function processD20Roll(
  result: RollServerResult,
  handlerType: string,
  options: {
    supportsCriticalHits?: boolean;
    customProcessedData?: Record<string, unknown>;
  } = {}
): ProcessedRollResult {
  const total = calculateD20Total(result);
  const advantageMode = result.arguments.pluginArgs?.advantageMode;
  const supportsCriticalHits = options.supportsCriticalHits ?? false;
  
  // Create augmented roll result
  const augmentedResult = {
    ...result,
    calculatedTotal: total,
    isCriticalHit: supportsCriticalHits ? isCriticalHit(result) : false,
    processedData: {
      advantageMode,
      calculatedTotal: total,
      ...options.customProcessedData
    }
  };
  
  return {
    rollResult: augmentedResult,
    followUpActions: [], // Modern architecture uses handleRoll for side effects
    executeDefaultSideEffects: false,
    processingInfo: {
      handlerType,
      calculationDetails: {
        originalTotal: total,
        advantageMode,
        criticalHit: supportsCriticalHits ? isCriticalHit(result) : undefined,
        criticalFailure: supportsCriticalHits ? isCriticalFailure(result) : undefined
      }
    }
  };
}

/**
 * Common logging function for D&D roll handlers
 * 
 * @param handlerName - Name of the handler (for log prefix)
 * @param rollType - Type of roll being processed
 * @param result - The roll result
 * @param context - Additional context data for logging
 */
export function logRollProcessing(
  handlerName: string, 
  rollType: string, 
  result: RollServerResult,
  context: Record<string, unknown> = {}
): void {
  const total = (result as any).calculatedTotal ?? calculateD20Total(result);
  
  console.log(`[${handlerName}] Processing ${rollType}:`, {
    advantageMode: result.arguments.pluginArgs?.advantageMode,
    total,
    characterName: result.metadata.characterName,
    ...context
  });
}