/**
 * D&D 5e 2024 Turn State Management
 * 
 * D&D-specific turn state types and utilities for tracking action economy,
 * spell slots, and other per-turn resources specific to D&D 5e rules.
 */

/**
 * D&D 5e Action Economy State
 * Tracks the various types of actions available in D&D combat
 */
export interface DndActionState {
  /** Whether the main action has been used this turn */
  actionUsed: boolean;
  
  /** Whether the bonus action has been used this turn */
  bonusActionUsed: boolean;
  
  /** Whether a reaction has been used this round (resets at start of turn) */
  reactionUsed: boolean;
  
  /** Number of legendary actions used (for creatures with legendary actions) */
  legendaryActionsUsed: number;
  
  /** Maximum legendary actions per round (usually 3) */
  legendaryActionsMax: number;
  
  /** Whether movement has been used (for tracking opportunity attacks) */
  hasMovedThisTurn: boolean;
}

/**
 * D&D 5e Spell Slot Usage State
 * Tracks spell slot consumption during combat
 */
export interface DndSpellSlotState {
  /** Used spell slots by level (1-9) */
  used: Record<number, number>;
  
  /** Maximum spell slots by level (1-9) */
  max: Record<number, number>;
}

/**
 * D&D 5e Class Resource State
 * Tracks class-specific resources like Ki, Rage, etc.
 */
export interface DndClassResourceState {
  /** Resource identifier (e.g., 'ki-points', 'rage-uses', 'channel-divinity') */
  resourceId: string;
  
  /** Current available uses */
  current: number;
  
  /** Maximum uses */
  maximum: number;
  
  /** How the resource resets */
  resetType: 'short-rest' | 'long-rest' | 'daily';
}

/**
 * Complete D&D 5e Turn State
 * Contains all D&D-specific state that needs to be tracked during a turn
 */
export interface DndTurnState {
  /** Action economy tracking */
  actions: DndActionState;
  
  /** Spell slot usage (for spellcasters) */
  spellSlots: DndSpellSlotState;
  
  /** Class-specific resources */
  classResources: DndClassResourceState[];
  
  /** Condition tracking (concentration, etc.) */
  conditions: {
    /** Whether maintaining concentration on a spell */
    concentrating: boolean;
    
    /** Other active conditions */
    active: string[];
  };
  
  /** Damage taken this turn (for concentration saves) */
  damageTaken: number;
}

/**
 * D&D Resource IDs - Standard resource identifiers
 */
export const DND_RESOURCE_IDS = {
  // Actions
  ACTION: 'action',
  BONUS_ACTION: 'bonus-action',
  REACTION: 'reaction',
  LEGENDARY_ACTION: 'legendary-action',
  
  // Spell Slots
  SPELL_SLOT_1: 'spell-slot-1',
  SPELL_SLOT_2: 'spell-slot-2',
  SPELL_SLOT_3: 'spell-slot-3',
  SPELL_SLOT_4: 'spell-slot-4',
  SPELL_SLOT_5: 'spell-slot-5',
  SPELL_SLOT_6: 'spell-slot-6',
  SPELL_SLOT_7: 'spell-slot-7',
  SPELL_SLOT_8: 'spell-slot-8',
  SPELL_SLOT_9: 'spell-slot-9',
  
  // Common Class Resources
  KI_POINTS: 'ki-points',
  RAGE_USES: 'rage-uses',
  CHANNEL_DIVINITY: 'channel-divinity',
  SUPERIORITY_DICE: 'superiority-dice',
  BARDIC_INSPIRATION: 'bardic-inspiration',
  SORCERY_POINTS: 'sorcery-points'
} as const;

/**
 * Utility functions for D&D turn state management
 */
export const DndTurnStateUtils = {
  /**
   * Create initial D&D turn state
   */
  createInitialState(): DndTurnState {
    return {
      actions: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        legendaryActionsUsed: 0,
        legendaryActionsMax: 0,
        hasMovedThisTurn: false
      },
      spellSlots: {
        used: {},
        max: {}
      },
      classResources: [],
      conditions: {
        concentrating: false,
        active: []
      },
      damageTaken: 0
    };
  },
  
  /**
   * Reset turn state for new turn
   */
  resetForNewTurn(state: DndTurnState): DndTurnState {
    return {
      ...state,
      actions: {
        ...state.actions,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false, // Reactions reset at start of turn
        hasMovedThisTurn: false
        // Note: legendary actions don't reset per turn
      },
      damageTaken: 0
    };
  },
  
  /**
   * Check if an action type can be used
   */
  canUseAction(state: DndTurnState, actionType: string): boolean {
    switch (actionType) {
      case DND_RESOURCE_IDS.ACTION:
        return !state.actions.actionUsed;
        
      case DND_RESOURCE_IDS.BONUS_ACTION:
        return !state.actions.bonusActionUsed;
        
      case DND_RESOURCE_IDS.REACTION:
        return !state.actions.reactionUsed;
        
      case DND_RESOURCE_IDS.LEGENDARY_ACTION:
        return state.actions.legendaryActionsUsed < state.actions.legendaryActionsMax;
        
      default:
        return false;
    }
  },
  
  /**
   * Use an action and update state
   */
  useAction(state: DndTurnState, actionType: string): DndTurnState {
    const newState = { ...state };
    
    switch (actionType) {
      case DND_RESOURCE_IDS.ACTION:
        newState.actions = { ...newState.actions, actionUsed: true };
        break;
        
      case DND_RESOURCE_IDS.BONUS_ACTION:
        newState.actions = { ...newState.actions, bonusActionUsed: true };
        break;
        
      case DND_RESOURCE_IDS.REACTION:
        newState.actions = { ...newState.actions, reactionUsed: true };
        break;
        
      case DND_RESOURCE_IDS.LEGENDARY_ACTION:
        newState.actions = { 
          ...newState.actions, 
          legendaryActionsUsed: newState.actions.legendaryActionsUsed + 1 
        };
        break;
    }
    
    return newState;
  },
  
  /**
   * Check if a spell slot can be used
   */
  canUseSpellSlot(state: DndTurnState, level: number): boolean {
    const used = state.spellSlots.used[level] || 0;
    const max = state.spellSlots.max[level] || 0;
    return used < max;
  },
  
  /**
   * Use a spell slot and update state
   */
  useSpellSlot(state: DndTurnState, level: number): DndTurnState {
    const newState = { ...state };
    const currentUsed = newState.spellSlots.used[level] || 0;
    
    newState.spellSlots = {
      ...newState.spellSlots,
      used: {
        ...newState.spellSlots.used,
        [level]: currentUsed + 1
      }
    };
    
    return newState;
  }
};