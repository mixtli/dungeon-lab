/**
 * Utilities for converting between dice expressions and dice arrays
 * 
 * Dice expressions (for UI/display): "1d12+3", "2d6", "1d20-1"
 * Dice arrays (for internal processing): [{ sides: 12, quantity: 1 }]
 */

export interface DiceGroup {
  sides: number;
  quantity: number;
}

export interface ParsedDice {
  dice: DiceGroup[];
  modifier: number;
}

/**
 * Parse a dice expression string into a dice array and modifier
 * 
 * @param expression - Dice expression like "1d12+3", "2d6", "d20"
 * @returns Object with dice array and modifier, or null if invalid
 * 
 * @example
 * parseDiceExpression("1d12+3") // { dice: [{sides: 12, quantity: 1}], modifier: 3 }
 * parseDiceExpression("2d6") // { dice: [{sides: 6, quantity: 2}], modifier: 0 }
 */
export function parseDiceExpression(expression: string): ParsedDice | null {
  try {
    // Remove spaces and convert to lowercase
    const cleanExpression = expression.replace(/\s/g, '').toLowerCase();
    
    // Tokenize the formula - split on + and - while keeping the operators
    const tokens = cleanExpression.split(/([+-])/).filter(token => token.length > 0);
    
    const diceGroups: DiceGroup[] = [];
    let modifier = 0;
    let currentSign = 1; // 1 for positive, -1 for negative
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Handle operators
      if (token === '+') {
        currentSign = 1;
        continue;
      } else if (token === '-') {
        currentSign = -1;
        continue;
      }
      
      // Handle dice notation (e.g., "2d20", "d6")
      const diceMatch = token.match(/^(\d+)?d(\d+)$/);
      if (diceMatch) {
        const quantity = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        
        // Validate dice
        if (quantity < 1 || quantity > 20 || ![4, 6, 8, 10, 12, 20, 100].includes(sides)) {
          return null;
        }
        
        // For dice groups, we ignore the sign (dice are always additive)
        // Only apply sign to pure numeric modifiers
        diceGroups.push({ sides, quantity });
        continue;
      }
      
      // Handle pure numeric modifiers (e.g., "5", "12")
      const numericMatch = token.match(/^(\d+)$/);
      if (numericMatch) {
        const value = parseInt(numericMatch[1]);
        modifier += currentSign * value;
        continue;
      }
      
      // If we can't parse this token, the expression is invalid
      return null;
    }
    
    // Must have at least one dice group
    if (diceGroups.length === 0) {
      return null;
    }
    
    // Limit total dice groups to prevent abuse
    if (diceGroups.length > 5) {
      return null;
    }
    
    return {
      dice: diceGroups,
      modifier
    };
  } catch {
    return null;
  }
}

/**
 * Convert a dice array and modifier back to a dice expression string
 * 
 * @param dice - Array of dice groups
 * @param modifier - Numeric modifier to add/subtract
 * @returns Dice expression string
 * 
 * @example
 * diceArrayToExpression([{sides: 12, quantity: 1}], 3) // "1d12+3"
 * diceArrayToExpression([{sides: 6, quantity: 2}], -1) // "2d6-1" 
 * diceArrayToExpression([{sides: 20, quantity: 1}], 0) // "1d20"
 */
export function diceArrayToExpression(dice: DiceGroup[], modifier: number = 0): string {
  if (!dice || dice.length === 0) {
    throw new Error('Dice array cannot be empty');
  }
  
  // Convert dice groups to string parts
  const diceParts = dice.map(group => {
    if (group.quantity === 1) {
      return `d${group.sides}`;
    }
    return `${group.quantity}d${group.sides}`;
  });
  
  // Join dice parts with +
  let expression = diceParts.join('+');
  
  // Add modifier if present
  if (modifier > 0) {
    expression += `+${modifier}`;
  } else if (modifier < 0) {
    expression += `${modifier}`;  // The minus sign is included in the number
  }
  
  return expression;
}

/**
 * Validate a dice group array
 * 
 * @param dice - Array of dice groups to validate
 * @returns true if valid, false otherwise
 */
export function validateDiceArray(dice: DiceGroup[]): boolean {
  if (!dice || dice.length === 0 || dice.length > 5) {
    return false;
  }
  
  return dice.every(group => 
    group.quantity >= 1 && 
    group.quantity <= 20 &&
    [4, 6, 8, 10, 12, 20, 100].includes(group.sides)
  );
}