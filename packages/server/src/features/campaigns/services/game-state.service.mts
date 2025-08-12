import {
  ServerGameState,
  ServerGameStateWithVirtuals,
  StateOperation,
  StateUpdate,
  StateUpdateResponse,
  ICharacter,
  IActor
} from '@dungeon-lab/shared/types/index.mjs';
import { serverGameStateWithVirtualsSchema } from '@dungeon-lab/shared/schemas/server-game-state.schema.mjs';
import { GameStateModel } from '../models/game-state.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { 
  generateStateHash, 
  validateStateIntegrity, 
  incrementStateVersion, 
  isValidNextVersion,
  GameStateOperations
} from '@dungeon-lab/shared/utils/index.mjs';
import { logger } from '../../../utils/logger.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { DocumentModel } from '../../documents/models/document.model.mjs';
import mongoose, { Types, Document } from 'mongoose';
import deepDiffDefault from 'deep-diff';
const deepDiff = deepDiffDefault;

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

      // Parse the updated state with Zod schema (same parsing used during verification)
      // This ensures hash consistency by removing timestamp fields like createdAt/updatedAt
      const parsedUpdatedServerGameState: ServerGameStateWithVirtuals = serverGameStateWithVirtualsSchema.parse(updatedServerGameState);

      // Generate new version and hash from the parsed state
      const newVersion = incrementStateVersion(gameState.version);
      const newHash = generateStateHash(parsedUpdatedServerGameState);

      // Update GameState atomically with BOTH version and hash verification for defense in depth
      const updateResult = await GameStateModel.updateOne(
        { 
          _id: gameStateId,
          version: gameState.version, // Version check - prevents concurrent updates
          hash: gameState.hash        // Hash check - prevents corruption/partial writes
        },
        {
          $set: {
            state: parsedUpdatedServerGameState,  // Update the entire state with parsed client-ready data
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

      // Post-save verification to detect data corruption
      await this.verifyPostSaveState(gameStateId, parsedUpdatedServerGameState, newHash, {
        method: 'full-state-update',
        operationCount: operations.length
      }, operations);

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

  /**
   * Re-initialize game state from scratch by deleting existing state and rebuilding from campaign data
   * This is a "nuclear option" for when game state gets corrupted
   */
  async reinitializeGameState(campaignId: string): Promise<StateUpdateResponse> {
    try {
      logger.info('Re-initializing game state from scratch', { campaignId });

      // Delete existing GameState if it exists
      const deletedCount = await GameStateModel.deleteOne({ campaignId }).exec();
      if (deletedCount.deletedCount > 0) {
        logger.info('Deleted existing game state', { campaignId, deletedCount: deletedCount.deletedCount });
      }

      // Use existing initializeGameState method to rebuild from campaign data
      // This will load fresh data from campaign's characters, actors, items
      const result = await this.initializeGameState(campaignId);

      if (result.success) {
        logger.info('Game state re-initialized successfully', { 
          campaignId, 
          newVersion: result.newVersion,
          newHash: result.newHash?.substring(0, 16) + '...'
        });
      }

      return result;
    } catch (error) {
      logger.error('Error re-initializing game state:', error);
      return {
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to re-initialize game state'
        }
      };
    }
  }

  /**
   * Check game state status by validating hash integrity
   * This is a debugging method to diagnose state corruption issues
   */
  async checkGameStateStatus(gameStateId: string): Promise<{
    success: boolean;
    isHashValid: boolean;
    storedHash?: string;
    calculatedHash?: string;
    error?: string;
  }> {
    try {
      logger.info('Checking game state status', { gameStateId });

      // Get the current game state from database
      const gameState = await GameStateModel.findById(gameStateId).exec();
      if (!gameState) {
        return {
          success: false,
          isHashValid: false,
          error: 'Game state not found'
        };
      }

      // Parse the state data with Zod schema to ensure consistency
      const currentServerGameState: ServerGameStateWithVirtuals = serverGameStateWithVirtualsSchema.parse(gameState.state);
      
      // Generate fresh hash from current state
      const calculatedHash = generateStateHash(currentServerGameState);
      const storedHash = gameState.hash || '';
      
      // Validate state integrity using existing utility
      const isHashValid = validateStateIntegrity(currentServerGameState, storedHash);
      
      logger.info('Game state status check completed', { 
        gameStateId, 
        isHashValid,
        storedHash: storedHash.substring(0, 16) + '...',
        calculatedHash: calculatedHash.substring(0, 16) + '...'
      });

      return {
        success: true,
        isHashValid,
        storedHash: storedHash.substring(0, 16) + '...',
        calculatedHash: calculatedHash.substring(0, 16) + '...'
      };

    } catch (error) {
      logger.error('Failed to check game state status', { gameStateId, error });
      return {
        success: false,
        isHashValid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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

      // Debug logging right after document queries - BEFORE any processing
      logger.debug('[OWNERID-DEBUG] Documents immediately after query', {
        campaignId,
        firstCharacterRaw: characters.length > 0 ? {
          name: characters[0].name,
          ownerId: characters[0].ownerId,
          ownerIdType: typeof characters[0].ownerId,
          ownerIdConstructor: characters[0].ownerId?.constructor?.name,
          isMongooseDocument: characters[0] instanceof mongoose.Document,
          toObjectOwnerId: characters[0].toObject().ownerId,
          jsonOwnerId: JSON.parse(JSON.stringify(characters[0].toObject())).ownerId
        } : 'No characters',
        firstActorRaw: actors.length > 0 ? {
          name: actors[0].name,
          ownerId: actors[0].ownerId,
          ownerIdType: typeof actors[0].ownerId,
          ownerIdConstructor: actors[0].ownerId?.constructor?.name,
          isMongooseDocument: actors[0] instanceof mongoose.Document,
          toObjectOwnerId: actors[0].toObject().ownerId,
          jsonOwnerId: JSON.parse(JSON.stringify(actors[0].toObject())).ownerId
        } : 'No actors'
      });

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
        // Log ownerId value before cleanup to understand what we're dealing with
        if (obj.ownerId) {
          logger.debug('[OWNERID-DEBUG] Character ownerId before cleanup', {
            characterName: obj.name,
            characterId: obj._id,
            ownerIdValue: obj.ownerId,
            ownerIdType: typeof obj.ownerId,
            isObject: typeof obj.ownerId === 'object',
            stringified: JSON.stringify(obj.ownerId)
          });
        }
        // Clean up ownerId if it's been populated with full User object instead of ObjectId string
        if (obj.ownerId && typeof obj.ownerId === 'object') {
          logger.debug('[OWNERID-DEBUG] Removing object ownerId from character', {
            characterName: obj.name,
            characterId: obj._id,
            removedOwnerId: obj.ownerId
          });
          // Remove the populated user object completely since we only need the ObjectId string
          delete obj.ownerId;
        }
        return obj;
      });
      const actorsPlain = actors.map(doc => {
        const obj = JSON.parse(JSON.stringify(doc.toObject()));
        // Log ownerId value before cleanup to understand what we're dealing with
        if (obj.ownerId) {
          logger.debug('[OWNERID-DEBUG] Actor ownerId before cleanup', {
            actorName: obj.name,
            actorId: obj._id,
            ownerIdValue: obj.ownerId,
            ownerIdType: typeof obj.ownerId,
            isObject: typeof obj.ownerId === 'object',
            stringified: JSON.stringify(obj.ownerId)
          });
        }
        // Clean up ownerId if it's been populated with full User object instead of ObjectId string  
        if (obj.ownerId && typeof obj.ownerId === 'object') {
          logger.debug('[OWNERID-DEBUG] Removing object ownerId from actor', {
            actorName: obj.name,
            actorId: obj._id,
            removedOwnerId: obj.ownerId
          });
          // Remove the populated user object completely since we only need the ObjectId string
          delete obj.ownerId;
        }
        return obj;
      });

      // Validate that asset population worked correctly
      const charactersWithoutAssets = charactersPlain.filter((char: ICharacter) => {
        return (char.tokenImageId && !char.tokenImage) || (char.avatarId && !char.avatar);
      });
      
      const actorsWithoutAssets = actorsPlain.filter((actor: IActor) => {
        return actor.tokenImageId && !actor.tokenImage;
      });

      if (charactersWithoutAssets.length > 0) {
        logger.warn(`⚠️  Found ${charactersWithoutAssets.length} characters with missing asset population`, {
          campaignId,
          characterIds: charactersWithoutAssets.map(c => c.id)
        });
        charactersWithoutAssets.forEach((char: ICharacter) => {
          logger.warn(`  - Character "${char.name}" (${char.id}): tokenImageId=${char.tokenImageId}, avatarId=${char.avatarId}, hasTokenImage=${!!char.tokenImage}, hasAvatar=${!!char.avatar}`);
        });
      }

      if (actorsWithoutAssets.length > 0) {
        logger.warn(`⚠️  Found ${actorsWithoutAssets.length} actors with missing asset population`, {
          campaignId,
          actorIds: actorsWithoutAssets.map(a => a.id)
        });
        actorsWithoutAssets.forEach((actor: IActor) => {
          logger.warn(`  - Actor "${actor.name}" (${actor.id}): tokenImageId=${actor.tokenImageId}, hasTokenImage=${!!actor.tokenImage}`);
        });
      }

      // Log successful asset population counts for validation
      const charactersWithAssets = charactersPlain.filter((char: ICharacter) => char.tokenImage || char.avatar).length;
      const actorsWithAssets = actorsPlain.filter((actor: IActor) => actor.tokenImage).length;
      
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

      // Log final ownerId values that end up in game state
      logger.debug('[OWNERID-DEBUG] Final game state ownerId values', {
        campaignId,
        charactersWithOwnerId: charactersPlain.filter(char => char.ownerId).map(char => ({
          name: char.name,
          id: char._id,
          ownerId: char.ownerId,
          ownerIdType: typeof char.ownerId
        })),
        actorsWithOwnerId: actorsPlain.filter(actor => actor.ownerId).map(actor => ({
          name: actor.name,
          id: actor._id,
          ownerId: actor.ownerId,
          ownerIdType: typeof actor.ownerId
        })),
        charactersWithoutOwnerId: charactersPlain.filter(char => !char.ownerId).map(char => ({
          name: char.name,
          id: char._id
        })),
        actorsWithoutOwnerId: actorsPlain.filter(actor => !actor.ownerId).map(actor => ({
          name: actor.name,
          id: actor._id
        }))
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
    return GameStateOperations.applyOperations(gameState, operations);
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

  /**
   * Verify that the state we just saved to MongoDB matches what we intended to save
   * This helps diagnose data corruption issues by comparing expected vs. actual saved state
   */
  private async verifyPostSaveState(
    gameStateId: string, 
    expectedState: ServerGameStateWithVirtuals, 
    expectedHash: string,
    context: { method: string; operationCount?: number },
    operations: StateOperation[]
  ): Promise<void> {
    try {
      // Re-fetch the state that was just saved to MongoDB
      const gameState = await GameStateModel.findById(gameStateId).exec();
      if (!gameState) {
        logger.error('Post-save verification: Game state not found after save', { gameStateId, context });
        return;
      }

      // Use the raw retrieved state directly (no parsing) since it was already parsed before save
      // This ensures hash consistency with the saved data
      const retrievedState: ServerGameStateWithVirtuals = gameState.state;
      
      // Generate hash of the retrieved state
      const retrievedHash = generateStateHash(retrievedState);
      const storedHash = gameState.hash || '';

      // Compare hashes
      if (expectedHash === retrievedHash && expectedHash === storedHash) {
        logger.info('Post-save hash verification passed ✓', { 
          gameStateId, 
          expectedHash: expectedHash.substring(0, 16) + '...', 
          retrievedHash: retrievedHash.substring(0, 16) + '...',
          storedHash: storedHash.substring(0, 16) + '...',
          context
        });
        return;
      }

      // Hash mismatch detected - perform detailed analysis
      logger.error('Post-save hash verification FAILED ✗', { 
        gameStateId, 
        expectedHash: expectedHash.substring(0, 16) + '...', 
        retrievedHash: retrievedHash.substring(0, 16) + '...',
        storedHash: storedHash.substring(0, 16) + '...',
        context 
      });

      // Log the operations that led to this corruption
      logger.error('Operations that led to corruption:', {
        gameStateId,
        operationsCount: operations.length,
        operations: operations.map(op => ({
          operation: op.operation,
          path: op.path,
          valueType: typeof op.value,
          valuePreview: typeof op.value === 'string' ? op.value.substring(0, 100) : 
                       typeof op.value === 'object' ? JSON.stringify(op.value).substring(0, 100) :
                       String(op.value)
        }))
      });

      // Perform deep diff analysis
      const differences = deepDiff.diff(expectedState, retrievedState);
      
      if (differences && differences.length > 0) {
        logger.error('Data corruption detected - diff analysis:', {
          gameStateId,
          totalDifferences: differences.length,
          context
        });

        // Log first few differences with details
        const maxDiffsToLog = 5;
        differences.slice(0, maxDiffsToLog).forEach((diff, index: number) => {
          let diffDescription = '';
          const path = diff.path ? diff.path.join('.') : 'root';
          
          switch (diff.kind) {
            case 'N': // New property added
              diffDescription = `NEW at path '${path}': ${JSON.stringify(diff.rhs)}`;
              break;
            case 'D': // Property deleted
              diffDescription = `DELETE at path '${path}': ${JSON.stringify(diff.lhs)}`;
              break;
            case 'E': // Property edited
              diffDescription = `EDIT at path '${path}': ${JSON.stringify(diff.lhs)} → ${JSON.stringify(diff.rhs)}`;
              break;
            case 'A': // Array change
              diffDescription = `ARRAY at path '${path}[${diff.index}]': ${diff.item?.kind === 'N' ? 'ADDED' : diff.item?.kind === 'D' ? 'REMOVED' : 'MODIFIED'}`;
              break;
            default:
              diffDescription = `UNKNOWN change at path '${path}'`;
          }
          
          logger.error(`  - Difference ${index + 1}: ${diffDescription}`, { gameStateId });
        });

        if (differences.length > maxDiffsToLog) {
          logger.error(`  - ... and ${differences.length - maxDiffsToLog} more differences`, { gameStateId });
        }

        // Additional structural analysis
        const expectedStats = this.getStateStatistics(expectedState);
        const retrievedStats = this.getStateStatistics(retrievedState);
        
        logger.error('State structure comparison:', {
          gameStateId,
          expected: expectedStats,
          retrieved: retrievedStats,
          context
        });
      } else {
        logger.error('Hash mismatch but no structural differences detected - possible serialization issue', {
          gameStateId,
          expectedLength: JSON.stringify(expectedState).length,
          retrievedLength: JSON.stringify(retrievedState).length,
          context
        });
      }

    } catch (error) {
      logger.error('Post-save verification failed due to error:', { 
        gameStateId, 
        error: error instanceof Error ? error.message : String(error),
        context 
      });
    }
  }

  /**
   * Get basic statistics about game state structure for comparison
   */
  private getStateStatistics(state: ServerGameStateWithVirtuals): Record<string, unknown> {
    return {
      charactersCount: state.characters?.length || 0,
      actorsCount: state.actors?.length || 0,
      itemsCount: state.items?.length || 0,
      hasCurrentEncounter: !!state.currentEncounter,
      hasTurnManager: !!state.turnManager,
      pluginDataKeys: state.pluginData ? Object.keys(state.pluginData).length : 0,
      jsonSize: JSON.stringify(state).length
    };
  }

  /**
   * Reset the hash for a corrupted game state
   * Recalculates the hash from current state data and updates the database
   */
  async resetStateHash(gameStateId: string): Promise<{ success: boolean; error?: string; newHash?: string }> {
    try {
      logger.info('Resetting state hash', { gameStateId });

      // Get the current game state from database
      const gameState = await GameStateModel.findById(gameStateId).exec();
      if (!gameState) {
        return { success: false, error: 'Game state not found' };
      }

      // Parse the state data with Zod schema to ensure consistency
      const currentServerGameState: ServerGameStateWithVirtuals = serverGameStateWithVirtualsSchema.parse(gameState.state);
      
      // Generate fresh hash from current state
      const newHash = generateStateHash(currentServerGameState);
      
      // Update the hash in database
      await GameStateModel.findByIdAndUpdate(gameStateId, {
        hash: newHash
      }).exec();

      logger.info('State hash reset successfully', { 
        gameStateId, 
        oldHash: gameState.hash?.substring(0, 16) + '...',
        newHash: newHash.substring(0, 16) + '...'
      });

      return { 
        success: true, 
        newHash 
      };

    } catch (error) {
      logger.error('Failed to reset state hash', { gameStateId, error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}