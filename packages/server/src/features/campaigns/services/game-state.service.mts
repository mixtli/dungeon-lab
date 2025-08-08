import {
  ServerGameState,
  StateOperation,
  StateUpdate,
  StateUpdateResponse,
  IGameSession
} from '@dungeon-lab/shared/types/index.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { 
  generateStateHash, 
  validateStateIntegrity, 
  incrementStateVersion, 
  isValidNextVersion 
} from '@dungeon-lab/shared/utils/state-hash.mjs';
import { logger } from '../../../utils/logger.mjs';

/**
 * Options for state update operations
 */
interface StateUpdateOptions {
  skipHashCheck?: boolean; // Use direct MongoDB operations for performance
  enableMetrics?: boolean; // Log performance metrics
}

/**
 * Service for managing game state operations with atomic updates and version control
 */
export class GameStateService {
  
  /**
   * Apply a state update to a game session with optimistic concurrency control
   * Defaults to full validation for safety and predictability
   */
  async applyStateUpdate(stateUpdate: StateUpdate, options: StateUpdateOptions = {}): Promise<StateUpdateResponse> {
    const startTime = options.enableMetrics ? Date.now() : 0;
    
    // Manual performance optimization - only use direct updates when explicitly requested
    if (options.skipHashCheck) {
      const result = await this.applyDirectUpdate(stateUpdate);
      if (options.enableMetrics) {
        logger.info('Direct update completed', { 
          sessionId: stateUpdate.sessionId,
          duration: Date.now() - startTime,
          operationCount: stateUpdate.operations.length,
          method: 'direct-update'
        });
      }
      return result;
    }

    // Default to full state validation for safety and predictability
    return this.applyFullStateUpdate(stateUpdate, options, startTime);
  }

  /**
   * Apply state update using direct MongoDB operations (performance optimized)
   */
  private async applyDirectUpdate(stateUpdate: StateUpdate): Promise<StateUpdateResponse> {
    const { sessionId, version, operations } = stateUpdate;
    
    try {
      // Build MongoDB update operations
      const mongoOps = this.buildMongoOperations(operations);
      
      // Apply operations directly with version check (no hash check for performance)
      const updateResult = await GameSessionModel.updateOne(
        { 
          _id: sessionId,
          gameStateVersion: version // Only version check - no hash for performance
        },
        {
          ...mongoOps,
          $set: {
            ...(mongoOps.$set || {}),
            gameStateVersion: String(parseInt(version) + 1),
            lastStateUpdate: Date.now()
          }
        }
      ).exec();

      if (updateResult.matchedCount === 0) {
        // Check current version to provide specific error
        const currentSession = await GameSessionModel.findById(sessionId)
          .select('gameStateVersion')
          .exec();
        
        return {
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'State version conflict - refresh and try again',
            currentVersion: currentSession?.gameStateVersion,
            currentHash: undefined
          }
        };
      }

      const newVersion = String(parseInt(version) + 1);
      
      return {
        success: true,
        newVersion,
        newHash: undefined // No hash calculated in direct mode
      };
    } catch (error) {
      logger.error('Error in direct update:', error);
      return {
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: error instanceof Error ? error.message : 'Direct update failed'
        }
      };
    }
  }

  /**
   * Apply state update using full read-modify-write approach (with hash integrity)
   */
  private async applyFullStateUpdate(stateUpdate: StateUpdate, options: StateUpdateOptions, startTime: number): Promise<StateUpdateResponse> {
    const { sessionId, version, operations, source } = stateUpdate;
    
    try {
      // Get current session with retry logic for high-concurrency scenarios
      const session = await this.getSessionWithRetry(sessionId);
      if (!session) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Game session not found'
          }
        };
      }

      // Validate version for optimistic concurrency control
      if (!isValidNextVersion(session.gameStateVersion, version)) {
        return {
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'State version conflict - another update was applied',
            currentVersion: session.gameStateVersion,
            currentHash: session.gameStateHash || undefined
          }
        };
      }

      // Get current game state or initialize if null
      const currentGameState: ServerGameState = session.gameState || this.getInitialGameState();

      // Validate current state integrity if hash exists
      if (session.gameStateHash && !validateStateIntegrity(currentGameState, session.gameStateHash)) {
        logger.error('State integrity validation failed', { sessionId, currentVersion: session.gameStateVersion });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current state integrity check failed - state may be corrupted'
          }
        };
      }

      // Apply all operations atomically
      let updatedGameState: ServerGameState;
      try {
        updatedGameState = await this.applyOperations(currentGameState, operations);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Failed to apply operations: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        };
      }

      // Validate the updated state structure
      const validationResult = this.validateGameState(updatedGameState);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid state after update: ${validationResult.error}`
          }
        };
      }

      // Generate new version and hash
      const newVersion = incrementStateVersion(session.gameStateVersion);
      const newHash = generateStateHash(updatedGameState);

      // Update session atomically with BOTH version and hash verification for defense in depth
      const updateResult = await GameSessionModel.updateOne(
        { 
          _id: sessionId,
          gameStateVersion: session.gameStateVersion, // Version check - prevents concurrent updates
          gameStateHash: session.gameStateHash        // Hash check - prevents corruption/partial writes
        },
        {
          $set: {
            gameState: updatedGameState,
            gameStateVersion: newVersion,
            gameStateHash: newHash,
            lastStateUpdate: Date.now()
          }
        }
      ).exec();

      // Check if update was successful (version or hash conflict check)
      if (updateResult.matchedCount === 0) {
        // Re-fetch session to determine if it was version conflict or hash corruption
        const currentSession = await GameSessionModel.findById(sessionId)
          .select('gameStateVersion gameStateHash')
          .exec();
        
        if (currentSession) {
          if (currentSession.gameStateVersion !== session.gameStateVersion) {
            return {
              success: false,
              error: {
                code: 'VERSION_CONFLICT',
                message: 'State was modified by another process during update',
                currentVersion: currentSession.gameStateVersion,
                currentHash: currentSession.gameStateHash || undefined
              }
            };
          } else if (currentSession.gameStateHash !== session.gameStateHash) {
            return {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'State integrity check failed - data corruption detected',
                currentVersion: currentSession.gameStateVersion,
                currentHash: currentSession.gameStateHash || undefined
              }
            };
          }
        }
        
        // Generic failure if we can't determine the specific cause
        return {
          success: false,
          error: {
            code: 'TRANSACTION_FAILED',
            message: 'Update failed due to concurrent modification or data corruption'
          }
        };
      }

      logger.info('Game state updated successfully', { 
        sessionId, 
        oldVersion: session.gameStateVersion, 
        newVersion,
        operationCount: operations.length,
        source,
        duration: options.enableMetrics ? Date.now() - startTime : undefined,
        method: 'full-state-update'
      });

      return {
        success: true,
        newVersion,
        newHash
      };

    } catch (error) {
      logger.error('Error applying state update:', error);
      return {
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update game state'
        }
      };
    }
  }


  /**
   * Build MongoDB update operations from state operations
   */
  private buildMongoOperations(operations: StateOperation[]): Record<string, unknown> {
    const mongoOps: Record<string, Record<string, unknown>> = {
      $set: {},
      $unset: {},
      $inc: {},
      $push: {},
      $pull: {}
    };

    for (const operation of operations) {
      const mongoPath = `gameState.${operation.path}`;
      
      switch (operation.operation) {
        case 'set':
          mongoOps.$set[mongoPath] = operation.value;
          break;
        case 'unset':
          mongoOps.$unset[mongoPath] = '';
          break;
        case 'inc':
          mongoOps.$inc[mongoPath] = typeof operation.value === 'number' ? operation.value : 1;
          break;
        case 'push':
          mongoOps.$push[mongoPath] = operation.value;
          break;
        case 'pull':
          mongoOps.$pull[mongoPath] = operation.value;
          break;
      }
    }

    // Remove empty operators
    Object.keys(mongoOps).forEach(key => {
      if (Object.keys(mongoOps[key]).length === 0) {
        delete mongoOps[key];
      }
    });

    return mongoOps;
  }

  /**
   * Get full game state for a session
   */
  async getGameState(sessionId: string): Promise<{
    gameState: ServerGameState | null;
    gameStateVersion: string;
    gameStateHash: string | null;
  } | null> {
    try {
      const session = await GameSessionModel.findById(sessionId)
        .select('gameState gameStateVersion gameStateHash')
        .exec();
      
      if (!session) {
        return null;
      }

      return {
        gameState: session.gameState,
        gameStateVersion: session.gameStateVersion,
        gameStateHash: session.gameStateHash
      };
    } catch (error) {
      logger.error('Error getting game state:', error);
      throw new Error('Failed to get game state');
    }
  }

  /**
   * Initialize game state for a new session from campaign data
   */
  async initializeGameState(sessionId: string, campaignId: string): Promise<StateUpdateResponse> {
    try {
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Game session not found'
          }
        };
      }

      // Don't reinitialize if gameState already exists
      if (session.gameState) {
        return {
          success: true,
          newVersion: session.gameStateVersion,
          newHash: session.gameStateHash || undefined
        };
      }

      // Load campaign data (characters, actors, items)
      const initialGameState = await this.loadCampaignData(campaignId);
      
      const initialVersion = '1';
      const initialHash = generateStateHash(initialGameState);

      await GameSessionModel.updateOne(
        { _id: sessionId },
        {
          $set: {
            gameState: initialGameState,
            gameStateVersion: initialVersion,
            gameStateHash: initialHash,
            lastStateUpdate: Date.now()
          }
        }
      ).exec();

      logger.info('Game state initialized', { 
        sessionId, 
        campaignId, 
        version: initialVersion,
        charactersCount: initialGameState.characters.length,
        actorsCount: initialGameState.actors.length,
        itemsCount: initialGameState.items.length
      });

      return {
        success: true,
        newVersion: initialVersion,
        newHash: initialHash
      };
    } catch (error) {
      logger.error('Error initializing game state:', error);
      return {
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to initialize game state'
        }
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load campaign data (characters, actors, items) for game state initialization
   */
  private async loadCampaignData(campaignId: string): Promise<ServerGameState> {
    try {
      // Import models dynamically to avoid circular dependencies
      const { DocumentModel } = await import('../../documents/models/document.model.mjs');
      const { Types } = await import('mongoose');
      
      // Convert campaignId string to ObjectId for proper Mongoose querying
      const campaignObjectId = new Types.ObjectId(campaignId);
      
      logger.info('Loading campaign data', { campaignId, campaignObjectId: campaignObjectId.toString() });
      
      // Load all campaign-associated documents
      const [characters, actors, campaignItems] = await Promise.all([
        // Load characters belonging to this campaign with avatar and token assets
        DocumentModel.find({ 
          campaignId: campaignObjectId, 
          documentType: 'character' 
        }).populate(['avatar', 'defaultTokenImage']).exec(),
        
        // Load actors (NPCs, monsters) belonging to this campaign
        DocumentModel.find({ 
          campaignId: campaignObjectId, 
          documentType: 'actor' 
        }).exec(),
        
        // Load items belonging to this campaign
        DocumentModel.find({ 
          campaignId: campaignObjectId, 
          documentType: 'item' 
        }).exec()
      ]);

      logger.info('Loaded campaign documents', { 
        campaignId,
        charactersCount: characters.length,
        actorsCount: actors.length,
        campaignItemsCount: campaignItems.length
      });

      // Load inventory items for all characters
      const allInventoryItemIds: string[] = [];
      for (const character of characters) {
        if (character.inventory && Array.isArray(character.inventory)) {
          for (const invItem of character.inventory) {
            if (invItem.itemId && !allInventoryItemIds.includes(invItem.itemId.toString())) {
              allInventoryItemIds.push(invItem.itemId.toString());
            }
          }
        }
      }

      // Load inventory items if any exist
      let inventoryItems: any[] = [];
      if (allInventoryItemIds.length > 0) {
        const inventoryItemObjectIds = allInventoryItemIds.map(id => new Types.ObjectId(id));
        inventoryItems = await DocumentModel.find({
          _id: { $in: inventoryItemObjectIds },
          documentType: 'item'
        }).exec();
        
        logger.info('Loaded inventory items', { 
          campaignId,
          inventoryItemIds: allInventoryItemIds,
          inventoryItemsCount: inventoryItems.length
        });
      }

      // Combine campaign items and inventory items
      const allItems = [...campaignItems, ...inventoryItems];

      logger.info('Final campaign data loaded', { 
        campaignId,
        charactersCount: characters.length,
        actorsCount: actors.length,
        totalItemsCount: allItems.length
      });

      // Convert Mongoose documents to plain objects to avoid circular references in hash generation
      return {
        characters: characters.map(doc => doc.toObject()), // Convert from Mongoose documents to plain objects
        actors: actors.map(doc => doc.toObject()),         // Convert from Mongoose documents to plain objects
        items: allItems.map(doc => doc.toObject()),        // Convert from Mongoose documents to plain objects
        currentEncounter: null,                            // No active encounter initially
        pluginData: {}                                     // Empty plugin data initially
      };
    } catch (error) {
      logger.error('Error loading campaign data:', error);
      // Fall back to empty state if loading fails
      return this.getInitialGameState();
    }
  }

  /**
   * Get session with retry logic for high-concurrency scenarios
   */
  private async getSessionWithRetry(sessionId: string, retries = 3): Promise<IGameSession | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const session = await GameSessionModel.findById(sessionId).exec();
        return session;
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 10 * (i + 1)));
      }
    }
    return null;
  }

  /**
   * Get initial empty game state structure
   */
  private getInitialGameState(): ServerGameState {
    return {
      characters: [],
      actors: [],
      items: [],
      currentEncounter: null,
      pluginData: {}
    };
  }

  /**
   * Apply multiple state operations to game state
   */
  private async applyOperations(gameState: ServerGameState, operations: StateOperation[]): Promise<ServerGameState> {
    let currentState = JSON.parse(JSON.stringify(gameState)); // Deep clone

    for (const operation of operations) {
      currentState = this.applyOperation(currentState, operation);
    }

    return currentState;
  }

  /**
   * Apply a single state operation using proper path parsing
   */
  private applyOperation(gameState: ServerGameState, operation: StateOperation): ServerGameState {
    const { path, operation: op, value } = operation;

    try {
      // Parse path into segments
      const pathSegments = this.parsePath(path);
      
      // Navigate to target location
      const { parent, key } = this.navigateToParent(gameState, pathSegments);

      // Apply operation
      switch (op) {
        case 'set':
          parent[key] = value;
          break;
          
        case 'unset':
          if (Array.isArray(parent)) {
            parent.splice(parseInt(key), 1);
          } else {
            delete parent[key];
          }
          break;
          
        case 'inc': {
          const currentValue = typeof parent[key] === 'number' ? parent[key] : 0;
          parent[key] = currentValue + (typeof value === 'number' ? value : 1);
          break;
        }
          
        case 'push':
          if (!Array.isArray(parent[key])) {
            parent[key] = [];
          }
          (parent[key] as unknown[]).push(value);
          break;
          
        case 'pull':
          if (Array.isArray(parent[key])) {
            const array = parent[key] as unknown[];
            const index = array.findIndex((item: unknown) => 
              this.deepEqual(item, value)
            );
            if (index > -1) {
              array.splice(index, 1);
            }
          }
          break;
          
        default:
          throw new Error(`Unknown operation: ${op}`);
      }

      return gameState;
    } catch (error) {
      throw new Error(`Failed to apply operation ${op} at path ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a path string into segments, handling array indices and nested properties
   */
  private parsePath(path: string): string[] {
    // Handle paths like "characters.0.pluginData.hitPoints" or "characters[0].name"
    return path
      .replace(/\[(\d+)\]/g, '.$1') // Convert array notation to dot notation
      .split('.')
      .filter(segment => segment.length > 0);
  }

  /**
   * Navigate to the parent object/array of the target property
   */
  private navigateToParent(obj: Record<string, unknown>, pathSegments: string[]): { parent: Record<string, unknown>; key: string } {
    let current = obj;
    
    // Navigate to parent (all segments except the last)
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const segment = pathSegments[i];
      
      if (current[segment] === undefined) {
        // Create intermediate objects/arrays as needed
        const nextSegment = pathSegments[i + 1];
        const isNextSegmentArrayIndex = /^\d+$/.test(nextSegment);
        current[segment] = isNextSegmentArrayIndex ? [] : {};
      }
      
      current = current[segment] as Record<string, unknown>;
    }

    const key = pathSegments[pathSegments.length - 1];
    return { parent: current, key };
  }

  /**
   * Deep equality check for objects/arrays
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;
        if (!keysB.includes(key) || !this.deepEqual(aObj[key], bObj[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Validate game state structure
   */
  private validateGameState(gameState: ServerGameState): { isValid: boolean; error?: string } {
    try {
      // Basic structure validation
      if (!gameState || typeof gameState !== 'object') {
        return { isValid: false, error: 'Game state must be an object' };
      }

      // Required arrays
      if (!Array.isArray(gameState.characters)) {
        return { isValid: false, error: 'characters must be an array' };
      }
      if (!Array.isArray(gameState.actors)) {
        return { isValid: false, error: 'actors must be an array' };
      }
      if (!Array.isArray(gameState.items)) {
        return { isValid: false, error: 'items must be an array' };
      }

      // currentEncounter can be null or object
      if (gameState.currentEncounter !== null && typeof gameState.currentEncounter !== 'object') {
        return { isValid: false, error: 'currentEncounter must be null or an object' };
      }

      // pluginData must be an object
      if (!gameState.pluginData || typeof gameState.pluginData !== 'object') {
        return { isValid: false, error: 'pluginData must be an object' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}