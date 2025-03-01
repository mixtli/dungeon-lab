/**
 * API client for the D&D 5e 2024 initiative roll endpoint
 */

/**
 * Initiative roll request interface
 */
export interface InitiativeRollRequest {
  dexterityModifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  bonuses?: number;
}

/**
 * Initiative roll response interface
 */
export interface InitiativeRollResponse {
  total: number;
  rolls: number[];
  dexterityModifier: number;
  bonuses: number;
  success: boolean;
}

/**
 * Roll initiative
 * @param dexterityModifier The dexterity modifier to use
 * @param options Additional options (advantage, disadvantage, bonuses)
 * @returns Promise with the initiative roll results
 */
export async function rollInitiative(
  dexterityModifier: number,
  options: {
    advantage?: boolean;
    disadvantage?: boolean;
    bonuses?: number;
  } = {}
): Promise<InitiativeRollResponse> {
  try {
    const response = await fetch('/api/plugins/dnd-5e-2024/initiative/roll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dexterityModifier,
        ...options
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to roll initiative');
    }

    return await response.json();
  } catch (error) {
    console.error('Error rolling initiative:', error);
    throw error;
  }
}

export default {
  rollInitiative
}; 