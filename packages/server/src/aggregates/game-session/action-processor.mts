import type { 
  GameActionRequest
} from '@dungeon-lab/shared/schemas/socket/actions.mjs';
import { logger } from '../../utils/logger.mjs';
import type { 
  ActionMessage,
  SessionSettings,
  QueuedAction,
  InternalActionResult
} from './types.mjs';

/**
 * Configuration for action processing
 */
interface ActionProcessorConfig {
  maxConcurrentActions: number;
  actionTimeoutMs: number;
  requireGMApproval: boolean;
  allowPlayerActionsWhenPaused: boolean;
}

/**
 * Default configuration for action processing
 */
const DEFAULT_CONFIG: ActionProcessorConfig = {
  maxConcurrentActions: 10,
  actionTimeoutMs: 30000, // 30 seconds
  requireGMApproval: true,
  allowPlayerActionsWhenPaused: false
};

/**
 * Action processing context information
 */
interface ActionContext {
  playerId: string;
  sessionId: string;
  isPlayerTurn: boolean;
  sessionSettings: SessionSettings;
  playerPermissions: Record<string, unknown>;
}

/**
 * Handles game action processing for GameSession aggregate
 * 
 * Responsibilities:
 * - Validate action eligibility and permissions
 * - Process actions through appropriate game logic
 * - Track action state and timeouts
 * - Handle concurrent action limits
 * - Manage action approval workflows
 */
export class ActionProcessor {
  private pendingActions: Map<string, ActionMessage> = new Map();
  private processingActions: Map<string, ActionMessage> = new Map();
  private config: ActionProcessorConfig;
  private actionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private sessionId: string, 
    config: Partial<ActionProcessorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a game action request
   */
  public async processAction(
    action: GameActionRequest,
    context: ActionContext
  ): Promise<ActionMessage> {
    // Create action message
    const actionMessage: ActionMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId: context.playerId,
      sessionId: context.sessionId,
      action,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Validate action eligibility
    const validationResult = this.validateAction(action, context);
    if (!validationResult.isValid) {
      actionMessage.status = 'rejected';
      actionMessage.result = {
        actionId: action.actionId,
        success: false,
        timestamp: Date.now(),
        error: validationResult.reason,
        changes: []
      };
      
      logger.warn(`Action rejected: ${validationResult.reason}`, {
        sessionId: this.sessionId,
        playerId: context.playerId,
        actionType: action.actionType
      });
      
      return actionMessage;
    }

    // Check concurrent action limits
    if (this.processingActions.size >= this.config.maxConcurrentActions) {
      actionMessage.status = 'rejected';
      actionMessage.result = {
        actionId: action.actionId,
        success: false,
        timestamp: Date.now(),
        error: 'Too many concurrent actions',
        changes: []
      };
      
      logger.warn(`Action rejected due to concurrent limit`, {
        sessionId: this.sessionId,
        playerId: context.playerId,
        actionType: action.actionType,
        currentActions: this.processingActions.size,
        limit: this.config.maxConcurrentActions
      });
      
      return actionMessage;
    }

    // Add to pending actions
    this.pendingActions.set(actionMessage.id, actionMessage);
    
    // Set timeout for action
    this.setActionTimeout(actionMessage.id);

    // If GM approval is required, mark as pending
    if (this.config.requireGMApproval || context.sessionSettings.requireGMApproval) {
      logger.info(`Action pending GM approval`, {
        sessionId: this.sessionId,
        playerId: context.playerId,
        actionType: action.actionType,
        actionId: actionMessage.id
      });
      
      return actionMessage;
    }

    // Process action immediately
    return this.executeAction(actionMessage, context);
  }

  /**
   * Approve a pending action (GM approval workflow)
   */
  public async approveAction(
    actionId: string,
    context: ActionContext
  ): Promise<ActionMessage | null> {
    const actionMessage = this.pendingActions.get(actionId);
    if (!actionMessage) {
      logger.warn(`Attempted to approve non-existent action`, {
        sessionId: this.sessionId,
        actionId
      });
      return null;
    }

    return this.executeAction(actionMessage, context);
  }

  /**
   * Reject a pending action
   */
  public rejectAction(actionId: string, reason: string): ActionMessage | null {
    const actionMessage = this.pendingActions.get(actionId);
    if (!actionMessage) {
      logger.warn(`Attempted to reject non-existent action`, {
        sessionId: this.sessionId,
        actionId
      });
      return null;
    }

    // Remove from pending
    this.pendingActions.delete(actionId);
    this.clearActionTimeout(actionId);

    // Update status
    actionMessage.status = 'rejected';
    actionMessage.result = {
      actionId: actionMessage.action.actionId,
      success: false,
      timestamp: Date.now(),
      error: reason,
      changes: []
    };

    logger.info(`Action rejected by GM`, {
      sessionId: this.sessionId,
      playerId: actionMessage.playerId,
      actionType: actionMessage.action.actionType,
      reason
    });

    return actionMessage;
  }

  /**
   * Execute an approved action
   */
  private async executeAction(
    actionMessage: ActionMessage,
    context: ActionContext
  ): Promise<ActionMessage> {
    // Move from pending to processing
    this.pendingActions.delete(actionMessage.id);
    this.processingActions.set(actionMessage.id, actionMessage);
    actionMessage.status = 'processing';

    logger.info(`Executing action`, {
      sessionId: this.sessionId,
      playerId: actionMessage.playerId,
      actionType: actionMessage.action.actionType,
      actionId: actionMessage.id
    });

    try {
      // This is where the action would be sent to the appropriate plugin
      // For now, we simulate processing
      const result = await this.processActionThroughPlugin(
        actionMessage.action, 
        context
      );
      
      actionMessage.result = result;
      actionMessage.status = 'completed';
      
      logger.info(`Action completed successfully`, {
        sessionId: this.sessionId,
        playerId: actionMessage.playerId,
        actionType: actionMessage.action.actionType,
        actionId: actionMessage.id
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actionMessage.result = {
        actionId: actionMessage.action.actionId,
        success: false,
        timestamp: Date.now(),
        error: errorMessage,
        changes: []
      };
      actionMessage.status = 'rejected';
      
      logger.error(`Action processing failed`, {
        sessionId: this.sessionId,
        playerId: actionMessage.playerId,
        actionType: actionMessage.action.actionType,
        actionId: actionMessage.id,
        error: errorMessage
      });
    }

    // Remove from processing
    this.processingActions.delete(actionMessage.id);
    this.clearActionTimeout(actionMessage.id);

    return actionMessage;
  }

  /**
   * Process action through the appropriate plugin (placeholder)
   */
  private async processActionThroughPlugin(
    action: GameActionRequest,
    context: ActionContext
  ): Promise<InternalActionResult> {
    // This is a placeholder - in the real implementation, this would:
    // 1. Route the action to the appropriate plugin based on pluginId
    // 2. Let the plugin validate and process the action
    // 3. Return the plugin's response
    
    // For now, simulate a successful action
    return {
      actionId: action.actionId,
      success: true,
      timestamp: Date.now(),
      changes: [
        {
          type: 'action_processed',
          entity: 'session',
          entityId: this.sessionId,
          data: {
            actionType: action.actionType,
            playerId: context.playerId,
            timestamp: Date.now()
          }
        }
      ]
    };
  }

  /**
   * Validate if an action can be processed
   */
  private validateAction(
    action: GameActionRequest,
    context: ActionContext
  ): { isValid: boolean; reason?: string } {
    // Check if session allows player actions
    if (!context.sessionSettings.allowPlayerActions) {
      return {
        isValid: false,
        reason: 'Player actions are not allowed in this session'
      };
    }

    // Check if session is paused
    if (context.sessionSettings.isPaused && !this.config.allowPlayerActionsWhenPaused) {
      return {
        isValid: false,
        reason: 'Session is paused'
      };
    }

    // Check basic action structure
    if (!action.actionId || !action.actionType || !action.pluginId) {
      return {
        isValid: false,
        reason: 'Invalid action structure'
      };
    }

    // Check if it's the player's turn (for turn-based actions)
    if (this.requiresTurn(action.actionType) && !context.isPlayerTurn) {
      return {
        isValid: false,
        reason: 'Not your turn'
      };
    }

    return { isValid: true };
  }

  /**
   * Check if an action type requires it to be the player's turn
   */
  private requiresTurn(actionType: string): boolean {
    // This would be configurable or determined by the plugin
    // For now, assume these action types require turns
    const turnBasedActions = [
      'move',
      'attack',
      'cast_spell',
      'use_item',
      'end_turn'
    ];
    
    return turnBasedActions.includes(actionType);
  }

  /**
   * Set timeout for an action
   */
  private setActionTimeout(actionId: string): void {
    const timeout = setTimeout(() => {
      this.handleActionTimeout(actionId);
    }, this.config.actionTimeoutMs);
    
    this.actionTimeouts.set(actionId, timeout);
  }

  /**
   * Clear timeout for an action
   */
  private clearActionTimeout(actionId: string): void {
    const timeout = this.actionTimeouts.get(actionId);
    if (timeout) {
      clearTimeout(timeout);
      this.actionTimeouts.delete(actionId);
    }
  }

  /**
   * Handle action timeout
   */
  private handleActionTimeout(actionId: string): void {
    const pendingAction = this.pendingActions.get(actionId);
    const processingAction = this.processingActions.get(actionId);
    
    if (pendingAction) {
      this.rejectAction(actionId, 'Action timed out waiting for approval');
    } else if (processingAction) {
      this.processingActions.delete(actionId);
      processingAction.status = 'rejected';
      processingAction.result = {
        actionId: processingAction.action.actionId,
        success: false,
        timestamp: Date.now(),
        error: 'Action processing timed out',
        changes: []
      };
      
      logger.warn(`Action processing timed out`, {
        sessionId: this.sessionId,
        playerId: processingAction.playerId,
        actionType: processingAction.action.actionType,
        actionId
      });
    }
    
    this.actionTimeouts.delete(actionId);
  }

  /**
   * Get all pending actions
   */
  public getPendingActions(): ActionMessage[] {
    return Array.from(this.pendingActions.values());
  }

  /**
   * Get all processing actions
   */
  public getProcessingActions(): ActionMessage[] {
    return Array.from(this.processingActions.values());
  }

  /**
   * Get action by ID
   */
  public getAction(actionId: string): ActionMessage | null {
    return this.pendingActions.get(actionId) || 
           this.processingActions.get(actionId) || 
           null;
  }

  /**
   * Update processor configuration
   */
  public updateConfig(config: Partial<ActionProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Process queued actions (from GM disconnection)
   */
  public async processQueuedActions(
    queuedActions: QueuedAction[],
    context: ActionContext
  ): Promise<ActionMessage[]> {
    const results: ActionMessage[] = [];
    
    for (const queuedAction of queuedActions) {
      const gameAction: GameActionRequest = {
        actionId: queuedAction.actionId,
        playerId: queuedAction.playerId,
        sessionId: queuedAction.sessionId,
        timestamp: queuedAction.timestamp,
        pluginId: queuedAction.pluginId,
        actionType: queuedAction.actionType,
        payload: queuedAction.payload
      };
      
      const result = await this.processAction(gameAction, context);
      results.push(result);
    }
    
    logger.info(`Processed ${results.length} queued actions`, {
      sessionId: this.sessionId,
      successful: results.filter(r => r.result?.success).length,
      failed: results.filter(r => !r.result?.success).length
    });
    
    return results;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear all timeouts
    for (const timeout of this.actionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.actionTimeouts.clear();
    
    // Clear action maps
    this.pendingActions.clear();
    this.processingActions.clear();
  }
}