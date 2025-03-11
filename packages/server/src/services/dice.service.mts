import { IDieRollResult, IRollResult } from '@dungeon-lab/shared/index.mjs';

export class DiceService {
  /**
   * Parse a dice formula and roll the dice
   * @param formula The dice formula (e.g., "3d8+2")
   * @param userId The ID of the user making the roll
   * @returns The roll result
   */
  rollDice(formula: string, userId: string): IRollResult {
    const { count, die, modifier } = this.parseFormula(formula);
    const rolls: IDieRollResult[] = [];
    let total = 0;

    // Roll each die
    for (let i = 0; i < count; i++) {
      const result = Math.floor(Math.random() * die) + 1;
      rolls.push({ die, result });
      total += result;
    }

    // Add modifier
    total += modifier;

    return {
      formula,
      rolls,
      modifier,
      total,
      userId,
      timestamp: new Date()
    };
  }

  /**
   * Parse a dice formula into its components
   * @param formula The dice formula (e.g., "3d8+2")
   * @returns The parsed components
   */
  private parseFormula(formula: string): { count: number; die: number; modifier: number } {
    // Remove all whitespace
    formula = formula.replace(/\s/g, '');

    // Match the formula pattern: XdY+Z or XdY-Z
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
      throw new Error('Invalid dice formula. Expected format: XdY+Z (e.g., 3d8+2)');
    }

    const count = parseInt(match[1], 10);
    const die = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    // Validate the numbers
    if (count < 1 || count > 100) {
      throw new Error('Number of dice must be between 1 and 100');
    }
    if (!this.isValidDieType(die)) {
      throw new Error('Invalid die type. Allowed types: d4, d6, d8, d10, d12, d20, d100');
    }

    return { count, die, modifier };
  }

  /**
   * Check if a die type is valid
   * @param die The die type (number of sides)
   * @returns Whether the die type is valid
   */
  private isValidDieType(die: number): boolean {
    const validDice = [4, 6, 8, 10, 12, 20, 100];
    return validDice.includes(die);
  }
} 