import type { Roll, RollCallback, DiceStyle } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { useSocketStore } from '../stores/socket.store.mts';
import { useAuthStore } from '../stores/auth.store.mts';

/**
 * Centralized Roll Service
 * 
 * Handles all dice roll submissions with automatic user preference injection.
 * Ensures consistent behavior across all roll sources (plugins, UI components, etc.)
 */
export class RollService {
  /**
   * Submit a roll to the server with automatic user dice preferences
   * 
   * @param roll - The roll data to submit
   * @returns Promise that resolves when the roll is submitted
   */
  async submitRoll(roll: Roll): Promise<{ success: boolean; error?: string }> {
    const socketStore = useSocketStore();
    const authStore = useAuthStore();
    const socket = socketStore.socket;
    
    if (!socket) {
      const error = 'No socket connection available for roll submission';
      console.error('[RollService]', error);
      return { success: false, error };
    }
    
    // Create enhanced roll with user dice preferences
    const enhancedRoll = this.addUserDicePreferences(roll, authStore);
    
    console.log('[RollService] Submitting roll with user preferences:', {
      rollId: enhancedRoll.rollId,
      rollType: enhancedRoll.rollType,
      hasDiceStyle: !!enhancedRoll.diceStyle,
      diceStyleKeys: enhancedRoll.diceStyle ? Object.keys(enhancedRoll.diceStyle) : []
    });
    
    return new Promise((resolve) => {
      socket.emit('roll', enhancedRoll, (response: RollCallback) => {
        if (!response.success) {
          console.error('[RollService] Roll submission failed:', response.error);
          resolve({ success: false, error: response.error });
        } else {
          console.log('[RollService] Roll submitted successfully:', enhancedRoll.rollId);
          resolve({ success: true });
        }
      });
    });
  }
  
  /**
   * Add user dice preferences to a roll if not already specified
   * 
   * @param roll - The original roll data
   * @param authStore - Auth store containing user preferences
   * @returns Roll with dice preferences applied
   */
  private addUserDicePreferences(roll: Roll, authStore: ReturnType<typeof useAuthStore>): Roll {
    // If roll already has dice style preferences, don't override them
    if (roll.diceStyle && Object.keys(roll.diceStyle).length > 0) {
      console.log('[RollService] Roll already has dice style, using provided preferences');
      return roll;
    }
    
    // Get user dice preferences from auth store
    const userDicePreferences = authStore.user?.preferences?.dicePreferences;
    
    if (!userDicePreferences) {
      console.log('[RollService] No user dice preferences found, using default styling');
      return roll;
    }
    
    // Convert user preferences to DiceStyle format
    const diceStyle: DiceStyle = {
      theme_customColorset: userDicePreferences.theme_customColorset,
      theme_material: userDicePreferences.theme_material,
      light_intensity: userDicePreferences.light_intensity,
      gravity_multiplier: userDicePreferences.gravity_multiplier,
      sounds: userDicePreferences.sounds,
      baseScale: userDicePreferences.baseScale,
      strength: userDicePreferences.strength
    };
    
    console.log('[RollService] Applied user dice preferences to roll:', {
      rollId: roll.rollId,
      material: diceStyle.theme_material,
      backgroundColor: diceStyle.theme_customColorset?.background,
      sounds: diceStyle.sounds
    });
    
    return {
      ...roll,
      diceStyle
    };
  }
}

// Export singleton instance for consistent usage across the app
export const rollService = new RollService();