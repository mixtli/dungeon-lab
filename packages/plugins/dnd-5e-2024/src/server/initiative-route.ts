import { Router, Request, Response } from 'express';

/**
 * Interface for initiative roll request
 */
interface InitiativeRollRequest {
  dexterityModifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  bonuses?: number;
}

/**
 * Interface for initiative roll response
 */
interface InitiativeRollResponse {
  total: number;
  rolls: number[];
  dexterityModifier: number;
  bonuses: number;
  success: boolean;
}

/**
 * Roll dice function
 * @param sides Number of sides on the dice
 * @returns Random number between 1 and sides
 */
function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll initiative
 * @param req Express request
 * @param res Express response
 */
function rollInitiative(req: Request, res: Response): void {
  try {
    const { dexterityModifier, advantage, disadvantage, bonuses = 0 } = req.body as InitiativeRollRequest;
    
    // Validate input
    if (typeof dexterityModifier !== 'number') {
      res.status(400).json({ success: false, error: 'Dexterity modifier must be a number' });
      return;
    }
    
    // Roll dice based on advantage/disadvantage
    let rolls: number[] = [];
    let rollToUse: number;
    
    if (advantage && !disadvantage) {
      // Roll twice and take highest
      rolls = [rollDice(20), rollDice(20)];
      rollToUse = Math.max(...rolls);
    } else if (disadvantage && !advantage) {
      // Roll twice and take lowest
      rolls = [rollDice(20), rollDice(20)];
      rollToUse = Math.min(...rolls);
    } else {
      // Regular roll
      rolls = [rollDice(20)];
      rollToUse = rolls[0];
    }
    
    // Calculate total
    const total = rollToUse + dexterityModifier + bonuses;
    
    // Send response
    const response: InitiativeRollResponse = {
      total,
      rolls,
      dexterityModifier,
      bonuses,
      success: true
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error rolling initiative:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Create initiative router
 */
export function createInitiativeRouter(): Router {
  const router = Router();
  
  // POST /initiative/roll endpoint
  router.post('/roll', rollInitiative);
  
  return router;
}

export default createInitiativeRouter; 