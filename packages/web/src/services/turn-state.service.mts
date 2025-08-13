/**
 * Turn State Service
 * 
 * Utility service that integrates with the existing Turn Manager to track ephemeral
 * per-turn resource usage for the active participant only.
 * 
 * Key responsibilities:
 * - Track movement usage during active turn
 * - Manage plugin-defined resource consumption  
 * - Provide resource validation (can participant use X?)
 * - Reset state when Turn Manager signals new turn
 * - Emit events for UI reactivity
 * 
 * Integration with Turn Manager:
 * - Does NOT manage turn progression (Turn Manager handles that)
 * - Only tracks resources for the ACTIVE participant
 * - Listens to Turn Manager lifecycle events
 */

import { computed } from 'vue';
import type {
  ParticipantTurnState,
  MovementState,
  TurnStateEvents
} from '@dungeon-lab/shared/types/turn-state.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { GameSystemPlugin } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import { EventEmitter } from 'events';

/**
 * Turn State Service - Utility for tracking active participant's resources
 */
export class TurnStateService extends EventEmitter {
  
  /** Current active participant turn state (only one at a time) */
  private activeState: ParticipantTurnState | null = null;
  
  /** Current game system plugin for turn state management */
  private gameSystemPlugin: GameSystemPlugin | null = null;
  
  /**
   * Set the game system plugin for turn state management
   */
  setGameSystemPlugin(plugin: GameSystemPlugin): void {
    this.gameSystemPlugin = plugin;
  }
  
  /**
   * Called by Turn Manager when a participant's turn starts
   */
  async onTurnStart(participantId: string, document: BaseDocument): Promise<void> {
    // Clear previous active state
    this.activeState = null;
    
    if (!this.gameSystemPlugin) {
      console.warn('No game system plugin set for turn state service');
      return;
    }
    
    // Get movement limit from plugin
    const movementLimit = this.gameSystemPlugin.getMovementLimit(document);
    
    // Get initial plugin turn state
    const pluginData = this.gameSystemPlugin.getInitialTurnState?.(document) || {};
    
    // Create new active state
    this.activeState = {
      documentId: participantId,
      documentType: document.documentType,
      movement: this.createMovementState(movementLimit),
      resources: [],
      pluginData,
      lastUpdated: Date.now()
    };
    
    this.emit('turn-state-reset', {
      participantId,
      state: this.activeState
    });
  }
  
  /**
   * Called by Turn Manager when a turn ends
   */
  onTurnEnd(): void {
    // Clear active state - turn is over
    this.activeState = null;
  }
  
  /**
   * Use movement for the active participant
   */
  useMovement(amount: number): boolean {
    if (!this.activeState) {
      console.warn('No active turn state for movement usage');
      return false;
    }
    
    if (this.activeState.movement.remaining >= amount) {
      this.activeState.movement.used += amount;
      this.activeState.movement.remaining = this.activeState.movement.maximum - this.activeState.movement.used;
      this.activeState.lastUpdated = Date.now();
      
      this.emit('movement-used', {
        participantId: this.activeState.documentId,
        amount,
        remaining: this.activeState.movement.remaining
      });
      
      return true;
    }
    
    return false; // Not enough movement remaining
  }
  
  /**
   * Check if the active participant can use movement
   */
  canUseMovement(amount: number): boolean {
    if (!this.activeState) {
      return false;
    }
    return this.activeState.movement.remaining >= amount;
  }
  
  /**
   * Use a plugin-defined resource for the active participant
   */
  async useResource(resourceId: string, amount: number): Promise<boolean> {
    if (!this.activeState || !this.gameSystemPlugin) {
      return false;
    }
    
    // Check if plugin allows this resource usage
    const canUse = this.gameSystemPlugin.canUseResource?.(
      { id: this.activeState.documentId, documentType: this.activeState.documentType } as BaseDocument,
      resourceId,
      amount,
      this.activeState.pluginData
    );
    
    if (!canUse) {
      return false;
    }
    
    // Let plugin update the turn state
    const newPluginData = this.gameSystemPlugin.useResource?.(
      { id: this.activeState.documentId, documentType: this.activeState.documentType } as BaseDocument,
      resourceId,
      amount,
      this.activeState.pluginData
    );
    
    if (newPluginData) {
      this.activeState.pluginData = newPluginData;
      this.activeState.lastUpdated = Date.now();
      
      // Find or create generic resource state for tracking
      let resourceState = this.activeState.resources.find(r => r.resourceId === resourceId);
      if (!resourceState) {
        // Create new resource state if not exists
        resourceState = {
          resourceId,
          current: 0,
          maximum: 0,
          metadata: {}
        };
        this.activeState.resources.push(resourceState);
      }
      
      // Update current value (plugins manage this through their pluginData)
      resourceState.current = Math.max(0, resourceState.current - amount);
      
      this.emit('resource-used', {
        participantId: this.activeState.documentId,
        resourceId,
        amount,
        remaining: resourceState.current
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if the active participant can use a resource
   */
  canUseResource(resourceId: string, amount: number): boolean {
    if (!this.activeState || !this.gameSystemPlugin) {
      return false;
    }
    
    return this.gameSystemPlugin.canUseResource?.(
      { id: this.activeState.documentId, documentType: this.activeState.documentType } as BaseDocument,
      resourceId,
      amount,
      this.activeState.pluginData
    ) || false;
  }
  
  /**
   * Get the current active participant's turn state
   */
  getActiveState(): ParticipantTurnState | null {
    return this.activeState;
  }
  
  /**
   * Get reactive computed property for the active state (for Vue components)
   */
  useActiveState() {
    return computed(() => this.activeState);
  }
  
  /**
   * Check if there is an active turn
   */
  hasActiveTurn(): boolean {
    return this.activeState !== null;
  }
  
  /**
   * Create initial movement state
   */
  private createMovementState(maximum: number): MovementState {
    return {
      maximum,
      used: 0,
      remaining: maximum
    };
  }
}

// Create singleton service instance
export const turnStateService = new TurnStateService();

// Type-safe event emission
declare module 'events' {
  interface EventEmitter {
    emit<K extends keyof TurnStateEvents>(event: K, data: TurnStateEvents[K]): boolean;
    on<K extends keyof TurnStateEvents>(event: K, listener: (data: TurnStateEvents[K]) => void): this;
    once<K extends keyof TurnStateEvents>(event: K, listener: (data: TurnStateEvents[K]) => void): this;
    off<K extends keyof TurnStateEvents>(event: K, listener: (data: TurnStateEvents[K]) => void): this;
  }
}