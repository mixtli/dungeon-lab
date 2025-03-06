interface DiceResult {
  total: number;
  rolls: number[];
  formula: string;
}

/**
 * Roll dice based on a formula string (e.g., "2d6+3")
 * Supports basic dice notation: XdY+Z where:
 * X = number of dice
 * Y = number of sides
 * Z = modifier (optional)
 */
export async function rollDice(formula: string): Promise<DiceResult> {
  const diceRegex = /(\d+)d(\d+)(?:([+-])(\d+))?/;
  const match = formula.match(diceRegex);

  if (!match) {
    throw new Error('Invalid dice formula');
  }

  const [, numDice, numSides, operator, modifierStr] = match;
  const modifier = operator && modifierStr ? parseInt(modifierStr) * (operator === '+' ? 1 : -1) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < parseInt(numDice); i++) {
    rolls.push(Math.floor(Math.random() * parseInt(numSides)) + 1);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return {
    total,
    rolls,
    formula,
  };
} 