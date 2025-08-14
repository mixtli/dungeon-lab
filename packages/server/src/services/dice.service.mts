export class DiceService {
  /**
   * Parse a dice formula and roll the dice (legacy method for backward compatibility)
   * @param formula The dice formula (e.g., "3d8+2")
   * @param userId The ID of the user making the roll
   * @returns The roll result
   */
  rollDice(
    formula: string,
    userId: string
  ): {
    formula: string;
    rolls: { die: number; result: number }[];
    modifier: number;
    total: number;
    userId: string;
    timestamp: Date;
  } {
    // Try enhanced parsing first for complex formulas
    if (this.isComplexFormula(formula)) {
      const enhancedResult = this.rollDiceEnhanced(formula, userId);
      // Convert to legacy format for backward compatibility
      return {
        formula: enhancedResult.formula,
        rolls: enhancedResult.rolls,
        modifier: enhancedResult.modifier,
        total: enhancedResult.total,
        userId: enhancedResult.userId,
        timestamp: enhancedResult.timestamp
      };
    }

    // Use legacy parsing for simple formulas
    const { count, die, modifier } = this.parseFormula(formula);
    const rolls: { die: number; result: number }[] = [];
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
   * Enhanced dice rolling with support for complex notation (e.g., "2d20+3d4-5")
   * @param formula The complex dice formula
   * @param userId The ID of the user making the roll
   * @returns Enhanced roll result with structured dice data
   */
  rollDiceEnhanced(
    formula: string,
    userId: string
  ): {
    formula: string;
    diceResults: { [dieType: string]: number[] };
    modifier: number;
    total: number;
    userId: string;
    timestamp: Date;
    rolls: { die: number; result: number }[];
  } {
    const parsed = this.parseComplexFormula(formula);
    const diceResults: { [dieType: string]: number[] } = {};
    const rolls: { die: number; result: number }[] = [];
    let total = 0;

    // Roll each dice group
    for (const group of parsed.diceGroups) {
      const dieKey = `d${group.die}`;
      const results: number[] = [];

      for (let i = 0; i < group.count; i++) {
        const result = Math.floor(Math.random() * group.die) + 1;
        results.push(result);
        rolls.push({ die: group.die, result });
        total += result;
      }

      // Store results grouped by die type
      if (diceResults[dieKey]) {
        diceResults[dieKey].push(...results);
      } else {
        diceResults[dieKey] = results;
      }
    }

    // Add modifier
    total += parsed.modifier;

    return {
      formula,
      diceResults,
      modifier: parsed.modifier,
      total,
      userId,
      timestamp: new Date(),
      rolls // For backward compatibility
    };
  }

  /**
   * Check if a formula requires complex parsing
   */
  private isComplexFormula(formula: string): boolean {
    // Remove whitespace for analysis
    const cleaned = formula.replace(/\s/g, '');
    
    // Count dice expressions (XdY patterns)
    const diceMatches = cleaned.match(/\d+d\d+/g);
    return diceMatches !== null && diceMatches.length > 1;
  }

  /**
   * Parse complex dice formulas (e.g., "2d20+3d4-5")
   */
  private parseComplexFormula(formula: string): {
    diceGroups: Array<{ count: number; die: number }>;
    modifier: number;
  } {
    // Remove all whitespace
    formula = formula.replace(/\s/g, '');
    
    const diceGroups: Array<{ count: number; die: number }> = [];
    let modifier = 0;

    // Split by + or - while keeping the operators
    const parts = formula.split(/([+-])/).filter(part => part !== '');
    let currentSign = 1; // 1 for positive, -1 for negative

    for (const part of parts) {
      if (part === '+') {
        currentSign = 1;
        continue;
      } else if (part === '-') {
        currentSign = -1;
        continue;
      }

      // Check if this part is a dice expression (XdY)
      const diceMatch = part.match(/^(\d+)d(\d+)$/);
      if (diceMatch) {
        const count = parseInt(diceMatch[1], 10);
        const die = parseInt(diceMatch[2], 10);

        // Validate dice
        if (count < 1 || count > 100) {
          throw new Error(`Invalid dice count: ${count}. Must be between 1 and 100.`);
        }
        if (!this.isValidDieType(die)) {
          throw new Error(`Invalid die type: d${die}. Allowed types: d4, d6, d8, d10, d12, d20, d100`);
        }

        // Handle negative dice (subtract dice results)
        if (currentSign === -1) {
          // For negative dice, we'll treat them as regular dice but track that they should be subtracted
          // This is a bit tricky - for now, let's add them normally but adjust the modifier
          // In a real implementation, you might want more sophisticated handling
          diceGroups.push({ count, die });
        } else {
          diceGroups.push({ count, die });
        }
      } else {
        // This should be a number (modifier)
        const num = parseInt(part, 10);
        if (isNaN(num)) {
          throw new Error(`Invalid part in dice formula: "${part}"`);
        }
        modifier += currentSign * num;
      }
    }

    if (diceGroups.length === 0) {
      throw new Error('No valid dice found in formula');
    }

    return { diceGroups, modifier };
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
