import {
  ServerGameState,
  ServerGameStateWithVirtuals,
  StateOperation,
  StateUpdate,
  StateUpdateResponse
} from '@dungeon-lab/shared/types/index.mjs';
import { serverGameStateWithVirtualsSchema } from '@dungeon-lab/shared/schemas/server-game-state.schema.mjs';
import { GameStateModel } from '../models/game-state.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { 
  generateStateHash, 
  validateStateIntegrity, 
  incrementStateVersion, 
  isValidNextVersion 
} from '../../../utils/state-hash.mjs';
import { logger } from '../../../utils/logger.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { DocumentModel } from '../../documents/models/document.model.mjs';
import { Types, Document } from 'mongoose';

/**
 * Options for state update operations
 */
interface StateUpdateOptions {
  skipHashCheck?: boolean; // Use direct MongoDB operations for performance
  enableMetrics?: boolean; // Log performance metrics
}

/**
 * Service for managing game state operations with atomic updates and version control
 * 
 * ARCHITECTURAL DECISION - SINGLE VERSIONING SYSTEM:
 * This service implements the primary versioning system for all real-time game operations.
 * Encounters, characters, and other game entities do NOT use individual versioning for
 * real-time operations - they delegate to GameState versioning instead.
 * 
 * Why GameState-only versioning?
 * - Prevents version conflicts between entity updates and state updates
 * - Provides atomic updates across multiple entities in a single operation
 * - Simplifies conflict resolution in collaborative editing scenarios
 * - Ensures consistent state across all clients through single source of truth
 * 
 * Entity-level versioning (like encounter.version) is only used for:
 * - Administrative operations (create, delete, metadata changes)
 * - Non-real-time updates that don't affect game state
 */
export class GameStateService {
  
  /**
   * Apply a state update to a campaign's game state with optimistic concurrency control
   * Defaults to full validation for safety and predictability
   */
  async applyStateUpdate(stateUpdate: StateUpdate, options: StateUpdateOptions = {}): Promise<StateUpdateResponse> {
    const startTime = options.enableMetrics ? Date.now() : 0;
    
    // Manual performance optimization - only use direct updates when explicitly requested
    if (options.skipHashCheck) {
      const result = await this.applyDirectUpdate(stateUpdate);
      if (options.enableMetrics) {
        logger.info('Direct update completed', { 
          gameStateId: stateUpdate.gameStateId,
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
    const { gameStateId, version, operations } = stateUpdate;
    
    try {
      // Build MongoDB update operations
      const mongoOps = this.buildMongoOperations(operations);
      
      // Apply operations directly with version check (no hash for performance)
      const updateResult = await GameStateModel.updateOne(
        { 
          _id: gameStateId,
          version: version // Only version check - no hash for performance
        },
        {
          ...mongoOps,
          $set: {
            ...(mongoOps.$set || {}),
            version: String(parseInt(version) + 1),
            lastUpdate: Date.now()
          }
        }
      ).exec();

      if (updateResult.matchedCount === 0) {
        // Check current version to provide specific error
        const currentGameState = await GameStateModel.findById(gameStateId)
          .select('version')
          .exec();
        
        return {
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'State version conflict - refresh and try again',
            currentVersion: currentGameState?.version,
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
    const { gameStateId, version, operations, source } = stateUpdate;
    
    try {
      // Get current game state with retry logic for high-concurrency scenarios
      const gameState = await this.getGameStateByIdWithRetry(gameStateId);
      if (!gameState) {
        return {
          success: false,
          error: {
            code: 'GAMESTATE_NOT_FOUND',
            message: 'Game state not found'
          }
        };
      }

      // Validate version for optimistic concurrency control
      if (!isValidNextVersion(gameState.version, version)) {
        return {
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'State version conflict - another update was applied',
            currentVersion: gameState.version,
            currentHash: gameState.hash || undefined
          }
        };
      }

      // Extract current server game state from the GameState document
      // Use Zod parsing to ensure proper defaults and validation
      const storedStateData = JSON.parse(JSON.stringify(gameState.state));
      
      // Parse with Zod schema to restore any missing default values
      const currentServerGameState: ServerGameStateWithVirtuals = serverGameStateWithVirtualsSchema.parse(storedStateData);

      // Validate current state integrity if hash exists
      if (gameState.hash && !validateStateIntegrity(currentServerGameState, gameState.hash)) {
        logger.error('State integrity validation failed', { gameStateId, currentVersion: gameState.version });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current state integrity check failed - state may be corrupted'
          }
        };
      }

      // Apply all operations atomically
      let updatedServerGameState: ServerGameStateWithVirtuals;
      try {
        updatedServerGameState = await this.applyOperations(currentServerGameState, operations);
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
      const validationResult = this.validateGameState(updatedServerGameState);
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
      const newVersion = incrementStateVersion(gameState.version);
      const newHash = generateStateHash(updatedServerGameState);

      // Update GameState atomically with BOTH version and hash verification for defense in depth
      const updateResult = await GameStateModel.updateOne(
        { 
          _id: gameStateId,
          version: gameState.version, // Version check - prevents concurrent updates
          hash: gameState.hash        // Hash check - prevents corruption/partial writes
        },
        {
          $set: {
            state: updatedServerGameState,  // Update the entire state with client-ready data
            version: newVersion,
            hash: newHash,
            lastUpdate: Date.now()
          }
        }
      ).exec();

      // Check if update was successful (version or hash conflict check)
      if (updateResult.matchedCount === 0) {
        // Re-fetch game state to determine if it was version conflict or hash corruption
        const currentGameState = await GameStateModel.findById(gameStateId)
          .select('version hash')
          .exec();
        
        if (currentGameState) {
          if (currentGameState.version !== gameState.version) {
            return {
              success: false,
              error: {
                code: 'VERSION_CONFLICT',
                message: 'State was modified by another process during update',
                currentVersion: currentGameState.version,
                currentHash: currentGameState.hash || undefined
              }
            };
          } else if (currentGameState.hash !== gameState.hash) {
            return {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'State integrity check failed - data corruption detected',
                currentVersion: currentGameState.version,
                currentHash: currentGameState.hash || undefined
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
        gameStateId, 
        oldVersion: gameState.version, 
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
      // Prefix all paths with 'state.' since we're now storing everything in the state field
      const mongoPath = `state.${operation.path}`;
      
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
   * Get full game state for a campaign
   */
  async getGameState(campaignId: string): Promise<{
    gameState: ServerGameState | null;
    gameStateVersion: string;
    gameStateHash: string | null;
  } | null> {
    try {
      const gameStateDoc = await GameStateModel.findOne({ campaignId }).exec();
      
      if (!gameStateDoc) {
        return null;
      }

      // Extract the state and add an id field to match ServerGameState interface
      const serverGameState: ServerGameState = {
        id: gameStateDoc.id,
        ...JSON.parse(JSON.stringify(gameStateDoc.state))
      };

      return {
        gameState: serverGameState,
        gameStateVersion: gameStateDoc.version,
        gameStateHash: gameStateDoc.hash
      };
    } catch (error) {
      logger.error('Error getting game state:', error);
      throw new Error('Failed to get game state');
    }
  }

  /**
   * Initialize or refresh game state for a campaign from campaign data
   */
  async initializeGameState(campaignId: string): Promise<StateUpdateResponse> {
    try {
      // Check if GameState already exists
      const existingGameState = await GameStateModel.findOne({ campaignId }).exec();
      if (existingGameState) {
        return {
          success: true,
          newVersion: existingGameState.version,
          newHash: existingGameState.hash || undefined
        };
      }

      // Load campaign data (characters, actors, items)
      const initialGameData = await this.loadCampaignData(campaignId);
      
      // Parse with Zod schema to ensure consistent defaults and structure (same as validation)
      const parsedInitialState = serverGameStateWithVirtualsSchema.parse(initialGameData.state);
      
      const initialVersion = '1';
      const initialHash = generateStateHash(parsedInitialState);

      // Create new GameState document with new metadata + state structure
      await GameStateModel.create({
        campaignId,
        state: parsedInitialState,  // Store the Zod-parsed state with consistent structure
        version: initialVersion,
        hash: initialHash,
        lastUpdate: Date.now()
        // createdBy and updatedBy are optional, let Mongoose handle them
      });

      logger.info('Game state initialized', { 
        campaignId, 
        version: initialVersion,
        charactersCount: initialGameData.state.characters.length,
        actorsCount: initialGameData.state.actors.length,
        itemsCount: initialGameData.state.items.length
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
   * Returns the new state structure with populated assets
   */
  private async loadCampaignData(campaignId: string): Promise<{ state: ServerGameStateWithVirtuals }> {
    try {
      
      // Convert campaignId string to ObjectId for proper Mongoose querying
      const campaignObjectId = new Types.ObjectId(campaignId);
      
      logger.info('Loading campaign data', { campaignId, campaignObjectId: campaignObjectId.toString() });
      
      // Load campaign and all campaign-associated documents
      const [campaign, characters, actors, campaignItems] = await Promise.all([
        // Load the campaign itself
        CampaignModel.findById(campaignObjectId).exec(),
        // Load characters belonging to this campaign with avatar and token assets
        DocumentModel.find({ 
          campaignId: campaignObjectId, 
          documentType: 'character' 
        }).populate(['avatar', 'tokenImage']).exec(),
        
        // Load actors (NPCs, monsters) belonging to this campaign with token assets
        DocumentModel.find({ 
          campaignId: campaignObjectId, 
          documentType: 'actor' 
        }).populate(['tokenImage']).exec(),
        
        // Load items belonging to this campaign
        DocumentModel.find({ 
          campaignId: campaignObjectId,
          documentType: 'item'
        }).exec()
      ]);

      logger.info('Loaded campaign documents', { 
        campaignId,
        campaignFound: !!campaign,
        campaignIsNull: campaign === null,
        campaignName: campaign?.name || 'Unknown',
        actualCampaignId: campaign?.id,
        charactersCount: characters.length,
        actorsCount: actors.length,
        campaignItemsCount: campaignItems.length
      });

      // Load inventory items for all characters using ownerId relationships
      const allInventoryItemIds: string[] = [];
      for (const character of characters) {
        // Both actors and characters can have inventory via ownerId relationships
        const ownedItems = await DocumentService.inventory.getOwnedItems(character.id, campaignId);
        for (const item of ownedItems) {
          if (item.id && !allInventoryItemIds.includes(item.id.toString())) {
            allInventoryItemIds.push(item.id.toString());
          }
        }
      }

      // Load inventory items if any exist
      let inventoryItems: Document[] = [];
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

      // Convert Mongoose documents to plain objects with consistent ObjectId serialization
      // Use JSON.parse(JSON.stringify()) to ensure ObjectIds are converted to strings consistently
      const charactersPlain = characters.map(doc => {
        const obj = JSON.parse(JSON.stringify(doc.toObject()));
        // Clean up ownerId if it's been populated with full User object instead of ObjectId string
        if (obj.ownerId && typeof obj.ownerId === 'object') {
          // Remove the populated user object completely since we only need the ObjectId string
          delete obj.ownerId;
        }
        return obj;
      });
      const actorsPlain = actors.map(doc => {
        const obj = JSON.parse(JSON.stringify(doc.toObject()));
        // Clean up ownerId if it's been populated with full User object instead of ObjectId string  
        if (obj.ownerId && typeof obj.ownerId === 'object') {
          // Remove the populated user object completely since we only need the ObjectId string
          delete obj.ownerId;
        }
        return obj;
      });

      // Validate that asset population worked correctly
      const charactersWithoutAssets = charactersPlain.filter((char: any) => {
        return (char.tokenImageId && !char.tokenImage) || (char.avatarId && !char.avatar);
      });
      
      const actorsWithoutAssets = actorsPlain.filter((actor: any) => {
        return actor.tokenImageId && !actor.tokenImage;
      });

      if (charactersWithoutAssets.length > 0) {
        logger.warn(`⚠️  Found ${charactersWithoutAssets.length} characters with missing asset population`, {
          campaignId,
          characterIds: charactersWithoutAssets.map(c => c.id)
        });
        charactersWithoutAssets.forEach((char: any) => {
          logger.warn(`  - Character "${char.name}" (${char.id}): tokenImageId=${char.tokenImageId}, avatarId=${char.avatarId}, hasTokenImage=${!!char.tokenImage}, hasAvatar=${!!char.avatar}`);
        });
      }

      if (actorsWithoutAssets.length > 0) {
        logger.warn(`⚠️  Found ${actorsWithoutAssets.length} actors with missing asset population`, {
          campaignId,
          actorIds: actorsWithoutAssets.map(a => a.id)
        });
        actorsWithoutAssets.forEach((actor: any) => {
          logger.warn(`  - Actor "${actor.name}" (${actor.id}): tokenImageId=${actor.tokenImageId}, hasTokenImage=${!!actor.tokenImage}`);
        });
      }

      // Log successful asset population counts for validation
      const charactersWithAssets = charactersPlain.filter((char: any) => char.tokenImage || char.avatar).length;
      const actorsWithAssets = actorsPlain.filter((actor: any) => actor.tokenImage).length;
      
      if (charactersWithAssets > 0 || actorsWithAssets > 0) {
        logger.info(`✅ Asset population successful: ${charactersWithAssets} characters and ${actorsWithAssets} actors have populated assets`);
      }

      // Clean up campaign ownerId if needed with consistent ObjectId serialization
      const campaignPlain = campaign ? JSON.parse(JSON.stringify(campaign.toObject())) : null;
      if (campaignPlain?.ownerId && typeof campaignPlain.ownerId === 'object') {
        // Remove the populated user object completely since we only need the ObjectId string
        delete campaignPlain.ownerId;
      }

      // Clean up items ownerIds with consistent ObjectId serialization
      const itemsPlain = allItems.map(doc => {
        const obj = JSON.parse(JSON.stringify(doc.toObject()));
        // Clean up ownerId if it's been populated with full User object instead of ObjectId string
        if (obj.ownerId && typeof obj.ownerId === 'object') {
          // Remove the populated user object completely since we only need the ObjectId string
          delete obj.ownerId;
        }
        return obj;
      });

      return {
        state: {
          campaign: campaignPlain,                           // Convert campaign to plain object
          characters: charactersPlain,                       // Convert from Mongoose documents to plain objects
          actors: actorsPlain,                               // Convert from Mongoose documents to plain objects
          items: itemsPlain,                                 // Convert from Mongoose documents to plain objects
          currentEncounter: null,                            // No active encounter initially
          pluginData: {},                                    // Empty plugin data initially
          turnManager: null                                  // No active turn manager initially
        }
      };
    } catch (error) {
      logger.error('Error loading campaign data:', error);
      // Fall back to empty state if loading fails
      return this.getInitialGameState();
    }
  }


  /**
   * Get game state by ID with retry logic for high-concurrency scenarios
   */
  private async getGameStateByIdWithRetry(gameStateId: string, retries = 3): Promise<import('../models/game-state.model.mjs').IGameStateDocument | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const gameState = await GameStateModel.findById(gameStateId).exec();
        return gameState;
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
  private getInitialGameState(): { state: ServerGameStateWithVirtuals } {
    return {
      state: {
        campaign: null,
        characters: [],
        actors: [],
        items: [],
        currentEncounter: null,
        pluginData: {},
        turnManager: null
      }
    };
  }

  /**
   * Apply multiple state operations to game state
   */
  private async applyOperations(gameState: ServerGameStateWithVirtuals, operations: StateOperation[]): Promise<ServerGameStateWithVirtuals> {
    let currentState = JSON.parse(JSON.stringify(gameState)); // Deep clone

    for (const operation of operations) {
      currentState = this.applyOperation(currentState, operation);
    }

    return currentState;
  }

  /**
   * Apply a single state operation using proper path parsing
   */
  private applyOperation(gameState: ServerGameStateWithVirtuals, operation: StateOperation): ServerGameStateWithVirtuals {
    const { path, operation: op, value } = operation;

    try {
      // Parse path into segments
      const pathSegments = this.parsePath(path);
      
      // Navigate to target location
      const { parent, key } = this.navigateToParent(gameState as Record<string, unknown>, pathSegments);

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
  private validateGameState(gameState: ServerGameStateWithVirtuals): { isValid: boolean; error?: string } {
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

      // pluginData must be an object (allow undefined/null and default to empty object)
      if (gameState.pluginData !== undefined && gameState.pluginData !== null && typeof gameState.pluginData !== 'object') {
        return { isValid: false, error: 'pluginData must be an object' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}