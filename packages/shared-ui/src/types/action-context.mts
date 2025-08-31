import type { RollServerResult } from '@dungeon-lab/shared/types/socket/index.mjs';
import type { PluginContext } from './plugin-context.mjs';

/**
 * Data structure for roll request parameters
 */
export interface RollData {
  message?: string;
  dice: Array<{ sides: number; quantity: number }>;
  metadata?: Record<string, unknown>;
  /** Optional plugin component type for custom chat UI (e.g., 'roll-request-d20') */
  chatComponentType?: string;
}

/**
 * Specification for individual roll requests in multi-target scenarios
 */
export interface RollRequestSpec {
  playerId: string;
  rollType: string;
  rollData: RollData;
}

/**
 * Options for customizing chat message behavior
 */
export interface ChatOptions {
  recipientId?: string;
  recipientType?: 'user' | 'actor' | 'session' | 'system' | 'bot';
  isSystem?: boolean;
  timestamp?: string;
}

/**
 * Structured data for roll result messages
 */
export interface RollResultData {
  message: string;
  result: number;
  target?: number;
  success: boolean;
  rollType: string;
  recipients?: 'public' | 'gm' | 'private';
  damageInfo?: {
    amount: number;
    type: string;
  };
  /** Optional plugin component type for custom chat UI (e.g., 'dnd-roll-card', 'damage-card') */
  chatComponentType?: string;
}

/**
 * Async action context providing utilities for unified action handlers
 * Enables spell casting and other complex actions to manage complete workflows
 * within a single async function with proper error handling and cleanup.
 */
export interface AsyncActionContext {
  /**
   * Plugin context for document lookup and compendium access
   * Required for spell casting to lookup spell data via getDocument()
   */
  readonly pluginContext: PluginContext;

  /**
   * Send a roll request to a specific player and await the result
   * 
   * @param playerId - ID of player who should make the roll
   * @param rollType - Type of roll being requested (e.g., 'spell-attack', 'saving-throw')
   * @param rollData - Roll parameters including dice expression and metadata
   * @returns Promise that resolves with RollServerResult
   */
  sendRollRequest(
    playerId: string,
    rollType: string,
    rollData: RollData
  ): Promise<RollServerResult>;

  /**
   * Send multiple roll requests in parallel and await all results
   * Uses Promise.all() for coordination, handles partial failures gracefully
   * 
   * @param requests - Array of roll request specifications
   * @returns Promise that resolves with array of RollServerResults
   */
  sendMultipleRollRequests(requests: RollRequestSpec[]): Promise<RollServerResult[]>;

  /**
   * Send a chat message to the game session
   * 
   * @param message - Message content to send
   * @param options - Optional chat customization options
   */
  sendChatMessage(message: string, options?: ChatOptions): void;

  /**
   * Send a structured roll result to the chat
   * 
   * @param rollResultData - Structured roll result data
   * @param rollData - Optional detailed roll data for plugin components
   */
  sendRollResult(rollResultData: RollResultData, rollData?: RollServerResult): void;

  /**
   * Request confirmation from the GM for an action
   * 
   * @param message - Message describing what needs confirmation
   * @returns Promise that resolves with GM's decision (true = approved, false = denied)
   */
  requestGMConfirmation(message: string): Promise<boolean>;

  /**
   * Clean up any pending requests and resources
   * Called when action handler completes or fails
   */
  cleanup?(): void;
}