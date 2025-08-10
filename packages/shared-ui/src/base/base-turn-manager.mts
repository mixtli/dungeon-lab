import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Abstract base class for turn manager plugins
 * 
 * Prioritizes universal GM control with optional game-specific automation.
 * Default behavior works for any game system - random order with drag-and-drop reordering.
 * 
 * Core Philosophy:
 * - Manual GM control is always available (drag-and-drop reordering)
 * - Automatic calculation is optional game-specific enhancement  
 * - Simple systems need no configuration, complex systems get full features
 * 
 * Benefits:
 * - Universal foundation that works for narrative games, simple systems, etc.
 * - Lower barrier to entry for plugin developers
 * - Familiar drag-and-drop UX for GMs
 * - Full backwards compatibility for complex systems like D&D
 */
export abstract class BaseTurnManagerPlugin {
  // Abstract properties - must be implemented by concrete plugins
  abstract readonly pluginId: string;
  abstract readonly name: string;
  abstract readonly gameSystem: string;
  
  /**
   * Calculate initiative order for participants
   * Default: Random shuffle (works universally, fair for any system)
   * Override for game-specific initiative (d20+Dex, cards, bidding, etc.)
   */
  async calculateInitiative(participants: ITurnParticipant[]): Promise<ITurnParticipant[]> {
    // Random shuffle with sequential turnOrder for clear ordering
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    return shuffled.map((participant, index) => ({
      ...participant,
      turnOrder: shuffled.length - index, // Higher numbers go first
      participantData: {
        ...participant.participantData,
        initiativeMethod: 'random',
        originalIndex: index
      }
    }));
  }
  
  /**
   * Whether this system supports automatic initiative calculation
   * Default: false (most systems rely on GM manual ordering)
   * Override: true for systems with dice/cards/bidding mechanics
   */
  supportsAutomaticCalculation(): boolean {
    return false;
  }
  
  /**
   * Whether manual reordering is allowed
   * Default: true (universal GM control)
   * Override: false only for very rigid systems (rare)
   */
  allowsManualReordering(): boolean {
    return true;
  }
  
  /**
   * Label for the initiative calculation button
   * Default: "Start Turn Order" (generic)
   * Override: "Roll Initiative", "Draw Cards", etc.
   */
  getInitiativeButtonLabel(): string {
    return 'Start Turn Order';
  }
  
  /**
   * Whether to show automatic calculation button in UI
   * Default: Based on supportsAutomaticCalculation()
   * Override: For custom UI behavior
   */
  showCalculateButton(): boolean {
    return this.supportsAutomaticCalculation();
  }
  
  /**
   * Update participant order after manual reordering
   * Default: Update turnOrder based on new positions
   * Override: For custom reordering logic
   */
  async updateParticipantOrder(participants: ITurnParticipant[]): Promise<ITurnParticipant[]> {
    // Assign turnOrder based on array position (higher = earlier in turn order)
    return participants.map((participant, index) => ({
      ...participant,
      turnOrder: participants.length - index,
      participantData: {
        ...participant.participantData,
        manuallyOrdered: true
      }
    }));
  }
  
  /**
   * Whether initiative should be recalculated each round
   * Default: false (most systems use fixed initiative)
   * Override: true for systems like Savage Worlds with card-based initiative
   */
  shouldRecalculateOrderEachRound(): boolean {
    return false;
  }
  
  /**
   * Whether turn order can change mid-scene (delay, ready actions, etc.)
   * Default: false (most systems have locked turn order)
   * Override: true for flexible systems that allow order changes
   */
  canChangeOrderMidScene(): boolean {
    return false;
  }
  
  // Lifecycle hooks - default to no-ops, override as needed
  
  /**
   * Called when turn-based mode starts
   * Default: no-op
   * Override: for game-specific setup (buff tracking, condition management, etc.)
   */
  async onTurnOrderStart(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called when turn-based mode ends
   * Default: no-op  
   * Override: for cleanup, final effects processing, etc.
   */
  async onTurnOrderEnd(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called at the start of each round
   * Default: no-op
   * Override: for round-based effects, spell duration tracking, etc.
   */
  async onRoundStart(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called at the end of each round
   * Default: no-op
   * Override: for end-of-round processing, condition updates, etc.
   */
  async onRoundEnd(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called when a participant's turn starts
   * Default: no-op
   * Override: for turn-start effects, status updates, etc.
   */
  async onTurnStart(_participant: ITurnParticipant, _turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called when a participant's turn ends  
   * Default: no-op
   * Override: for turn-end effects, resource regeneration, etc.
   */
  async onTurnEnd(_participant: ITurnParticipant, _turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Validate turn progression logic
   * Default: always valid
   * Override: for custom turn flow validation
   */
  async validateTurnProgression(_turnManager: ITurnManager): Promise<boolean> {
    return true;
  }
  
  /**
   * Get available actions for a participant
   * Default: permissive - returns all provided action types
   * Override: for game-specific action filtering
   */
  getAvailableActions(participantId: string, turnManager: ITurnManager, allActionTypes: string[] = []): string[] {
    // Default: filter using canPerformAction
    return allActionTypes.filter(action => 
      this.canPerformAction(participantId, action, turnManager)
    );
  }
  
  /**
   * Custom turn logic hook
   * Default: no-op
   * Override: for complex turn progression logic
   */
  async customTurnLogic(turnManager: ITurnManager): Promise<ITurnManager> {
    return turnManager;
  }
  
  // Abstract methods - must be implemented by concrete plugins
  
  /**
   * Check if participant can perform a specific action
   * MUST IMPLEMENT: Game-specific action permission logic
   */
  abstract canPerformAction(
    participantId: string, 
    actionType: string, 
    turnManager: ITurnManager
  ): boolean;
}