import {
  ServerGameStateWithVirtuals,
  JsonPatchOperation,
  StateUpdate,
  StateUpdateResponse,
  BaseDocument
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
import { DocumentModel } from '../../documents/models/document.model.mjs';
import { Types } from 'mongoose';
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

      // Validate current state integrity if hash exists (use raw state for consistency with checkGameStateStatus)
      if (gameState.hash && !validateStateIntegrity(gameState.state, gameState.hash)) {
        logger.error('State integrity validation failed', { gameStateId, currentVersion: gameState.version });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current state integrity check failed - state may be corrupted'
          }
        };
      }

      // Extract current server game state from the GameState document
      // Parse with Zod schema to ensure proper defaults and validation (after hash validation)
      const currentServerGameState: ServerGameStateWithVirtuals = serverGameStateWithVirtualsSchema.parse(gameState.state);

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

      // Generate new version and prepare parsed state
      const parsedUpdatedState = serverGameStateWithVirtualsSchema.parse(updatedServerGameState);
      const newVersion = incrementStateVersion(gameState.version);

      // First, save the state without hash to ensure we get MongoDB's actual serialization
      const updateResult = await GameStateModel.updateOne(
        { 
          _id: gameStateId,
          version: gameState.version, // Version check - prevents concurrent updates
          hash: gameState.hash        // Hash check - prevents corruption/partial writes
        },
        {
          $set: {
            state: parsedUpdatedState,  // Save the parsed state
            version: newVersion,
            lastUpdate: Date.now()
            // Note: hash will be set in second update after fetching MongoDB-serialized data
          }
        }
      ).exec();

      if (updateResult.matchedCount === 0) {
        // Handle version/hash conflicts (same logic as before)
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
        
        return {
          success: false,
          error: {
            code: 'TRANSACTION_FAILED',
            message: 'Update failed due to concurrent modification or data corruption'
          }
        };
      }

      // Now fetch the saved state to get MongoDB's actual serialization
      const savedGameState = await GameStateModel.findById(gameStateId).exec();
      if (!savedGameState) {
        return {
          success: false,
          error: {
            code: 'TRANSACTION_FAILED',
            message: 'Failed to retrieve saved state for hash generation'
          }
        };
      }

      // DEBUG: Compare what we saved vs what MongoDB gave us back
      const originalJson = JSON.stringify(parsedUpdatedState);
      const retrievedJson = JSON.stringify(savedGameState.state);
      const dataMatches = originalJson === retrievedJson;
      
      console.log('[MongoDB Serialization Debug]:', {
        gameStateId,
        dataMatches,
        originalLength: originalJson.length,
        retrievedLength: retrievedJson.length,
        originalHash: generateStateHash(parsedUpdatedState).substring(0, 16) + '...',
        retrievedHash: generateStateHash(savedGameState.state).substring(0, 16) + '...'
      });

      if (!dataMatches) {
        // Find differences in structure
        const sampleDiff = originalJson.substring(0, 200) !== retrievedJson.substring(0, 200);
        if (sampleDiff) {
          console.log('[MongoDB Serialization Differences]:', {
            gameStateId,
            originalSample: originalJson.substring(0, 200),
            retrievedSample: retrievedJson.substring(0, 200)
          });
        }
      }

      // Generate hash from MongoDB's actual serialized data
      const newHash = generateStateHash(savedGameState.state);

      // Update the hash field with the MongoDB-consistent hash
      await GameStateModel.updateOne(
        { _id: gameStateId },
        { $set: { hash: newHash } }
      ).exec();


      logger.info('Game state updated successfully', { 
        gameStateId, 
        oldVersion: gameState.version, 
        newVersion,
        operationCount: operations.length,
        source,
        duration: options.enableMetrics ? Date.now() - startTime : undefined,
        method: 'full-state-update'
      });

      // Post-save verification to detect data corruption using MongoDB-serialized data
      await this.verifyPostSaveState(gameStateId, savedGameState.state, newHash, {
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
   * Build MongoDB update operations from JSON Patch operations
   * Converts RFC 6902 JSON Patch operations to MongoDB update operations
   */
  private buildMongoOperations(operations: JsonPatchOperation[]): Record<string, unknown> {
    const mongoOps: Record<string, Record<string, unknown>> = {
      $set: {},
      $unset: {}
    };

    for (const operation of operations) {
      // Convert JSON Pointer path to MongoDB dot notation and prefix with 'state.'
      // JSON Pointer: "/documents/character1/hitPoints" -> MongoDB: "state.documents.character1.hitPoints"
      const mongoPath = `state${operation.path.replace(/\//g, '.')}`;
      
      switch (operation.op) {
        case 'add':
        case 'replace':
          mongoOps.$set[mongoPath] = operation.value;
          break;
        case 'remove':
          mongoOps.$unset[mongoPath] = '';
          break;
        case 'move':
          // Move operation: remove from source, add to destination
          if (operation.from) {
            const fromPath = `state${operation.from.replace(/\//g, '.')}`;
            mongoOps.$unset[fromPath] = '';
            mongoOps.$set[mongoPath] = operation.value;
          }
          break;
        case 'copy':
          // Copy operation: add to destination (source remains)
          mongoOps.$set[mongoPath] = operation.value;
          break;
        case 'test':
          // Test operations don't modify data, skip
          break;
        default:
          console.warn(`[GameStateService] Unsupported JSON Patch operation: ${operation.op}`);
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
    gameState: ServerGameStateWithVirtuals | null;
    gameStateVersion: string;
    gameStateHash: string | null;
  } | null> {
    try {
      const gameStateDoc = await GameStateModel.findOne({ campaignId }).exec();
      
      if (!gameStateDoc) {
        return null;
      }

      // Extract the state directly - no artificial id field needed
      // This ensures consistency with hash generation which uses the same data structure
      const serverGameState: ServerGameStateWithVirtuals = JSON.parse(JSON.stringify(gameStateDoc.state));

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
      //console.log('initialGameData.state', initialGameData.state.documents);
      const parsedInitialState = serverGameStateWithVirtualsSchema.parse(initialGameData.state);
      
      const initialVersion = '1';
      console.log('keys', Object.keys(parsedInitialState));
      const originalState = JSON.parse(JSON.stringify(parsedInitialState)); // Deep copy for comparison
      console.log('originalState', Object.keys(originalState));
      const originalHash = generateStateHash(parsedInitialState);

      // Create new GameState document with new metadata + state structure
      const savedDoc = await GameStateModel.create({
        campaignId,
        state: parsedInitialState,  // Store the Zod-parsed state with consistent structure
        version: initialVersion,
        hash: originalHash,
        lastUpdate: Date.now()
        // createdBy and updatedBy are optional, let Mongoose handle them
      });

      // DEBUG: Pull it back out and compare both data and hash
      const retrievedDoc = await GameStateModel.findById(savedDoc._id).exec();
      if (!retrievedDoc) {
        throw new Error('Failed to retrieve saved GameState document');
      }
      console.log('retrievedDoc', Object.keys(retrievedDoc.state));
      const retrievedState = retrievedDoc.state;
      const retrievedHash = generateStateHash(retrievedState);
      
      console.log('=== HASH DEBUG COMPARISON ===');
      console.log('Original hash:', originalHash.substring(0, 16) + '...');
      console.log('Retrieved hash:', retrievedHash.substring(0, 16) + '...');
      console.log('Hashes match:', originalHash === retrievedHash);
      
      if (originalHash !== retrievedHash) {
        console.log('🚨 HASH MISMATCH DETECTED - MongoDB transformed the data');
        
        // Compare the actual data structures
        console.log('Original state keys:', Object.keys(originalState));
        console.log('Retrieved state keys:', Object.keys(retrievedState));
        
        // Check if documents are the main difference
        if (originalState.documents && retrievedState.documents) {
          const originalDocIds = Object.keys(originalState.documents);
          const retrievedDocIds = Object.keys(retrievedState.documents);
          
          console.log('Original document count:', originalDocIds.length);
          console.log('Retrieved document count:', retrievedDocIds.length);
          
          if (originalDocIds.length > 0 && retrievedDocIds.length > 0) {
            const firstOrigDoc = originalState.documents[originalDocIds[0]];
            const firstRetrDoc = retrievedState.documents[retrievedDocIds[0]];
            
            console.log('First document comparison:');
            console.log('Original doc keys:', Object.keys(firstOrigDoc));
            console.log('Retrieved doc keys:', Object.keys(firstRetrDoc));
            
            // Check for ObjectId differences
            const origDoc = firstOrigDoc as BaseDocument;
            const retrDoc = firstRetrDoc as BaseDocument;
            for (const key of Object.keys(firstOrigDoc)) {
              if (JSON.stringify(origDoc[key as keyof BaseDocument]) !== JSON.stringify(retrDoc[key as keyof BaseDocument])) {
                console.log(`Field '${key}' differs:`);
                console.log('  Original:', typeof origDoc[key as keyof BaseDocument], origDoc[key as keyof BaseDocument]);
                console.log('  Retrieved:', typeof retrDoc[key as keyof BaseDocument], retrDoc[key as keyof BaseDocument]);
              }
            }
          }
        }
        
        console.log('Data comparison available - original vs retrieved state differ');
      }

      return {
        success: true,
        newVersion: initialVersion,
        newHash: originalHash  // Return original hash for now
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

      // Use raw MongoDB-serialized state (no parsing) to match how hashes are now generated
      const currentServerGameState: ServerGameStateWithVirtuals = gameState.state;
      
      // Generate fresh hash from MongoDB-serialized state (matches save process)
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
      
      // Load campaign and all campaign documents with single unified query
      const [campaign, campaignDocuments] = await Promise.all([
        // Load the campaign itself
        CampaignModel.findById(campaignObjectId).exec(),
        // Load ALL documents belonging to this campaign with all asset relationships
        DocumentModel.find({ 
          campaignId: campaignObjectId
        }).populate(['avatar', 'tokenImage', 'image', 'thumbnail']).exec()
      ]);



      // Combine all campaign documents into unified record - no complex processing needed
      // JSON.stringify() will automatically call toJSON() on Mongoose documents with virtual fields
      
      // Combine all documents into unified record indexed by ID
      const documents: Record<string, BaseDocument> = {};
      
      // Simple transformation: add all documents to the unified record
      campaignDocuments.forEach(doc => {
        documents[doc.id] = doc.toJSON() as BaseDocument;
      });

      const result = {
        campaign: campaign?.toJSON() || null,
        documents,
        currentEncounter: null,
        pluginData: {},
        turnManager: null
      }
      logger.debug('Game state result summary:', {
        documentsCount: documents.length,
        hasCurrentEncounter: !!result.currentEncounter,
        hasPluginData: Object.keys(result.pluginData).length > 0,
        hasTurnManager: !!result.turnManager
      });

      return {
        state: result
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
        documents: {},                    // Empty unified documents record
        currentEncounter: null,
        pluginData: {},
        turnManager: null
      }
    };
  }

  /**
   * Apply multiple JSON Patch operations to game state
   */
  private async applyOperations(gameState: ServerGameStateWithVirtuals, operations: JsonPatchOperation[]): Promise<ServerGameStateWithVirtuals> {
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

      // Required documents record
      if (!gameState.documents || typeof gameState.documents !== 'object') {
        return { isValid: false, error: 'documents must be an object record' };
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
    operations: JsonPatchOperation[]
  ): Promise<void> {
    try {
      // Re-fetch the state that was just saved to MongoDB
      const gameState = await GameStateModel.findById(gameStateId).exec();
      if (!gameState) {
        logger.error('Post-save verification: Game state not found after save', { gameStateId, context });
        return;
      }

      // Use the raw retrieved state directly for hash verification
      const retrievedState: ServerGameStateWithVirtuals = gameState.state;
      const storedHash = gameState.hash || '';
      
      // Generate hash of the retrieved state
      const retrievedHash = generateStateHash(retrievedState);

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
          operation: op.op,
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
    // Count documents by type
    const documentCounts = Object.values(state.documents || {}).reduce((counts: Record<string, number>, doc: BaseDocument) => {
      const docType = doc.documentType;
      counts[docType] = (counts[docType] || 0) + 1;
      return counts;
    }, {});

    return {
      totalDocuments: Object.keys(state.documents || {}).length,
      documentCounts,
      hasCurrentEncounter: !!state.currentEncounter,
      hasTurnManager: !!state.turnManager,
      pluginDataKeys: state.pluginData ? Object.keys(state.pluginData).length : 0,
      jsonSize: JSON.stringify(state).length
    };
  }

  /**
   * Update game state for a campaign with proper permission checking and broadcasting
   * @param campaignId - The campaign ID to update
   * @param stateUpdate - The state update to apply
   * @param userId - The user making the update
   */
  async updateGameState(
    campaignId: string, 
    stateUpdate: StateUpdate, 
    userId: string,
    skipPermissionCheck = false
  ): Promise<StateUpdateResponse> {
    try {
      logger.info('Game state update received:', { 
        campaignId, 
        version: stateUpdate.version, 
        operationCount: stateUpdate.operations.length, 
        source: stateUpdate.source, 
        userId 
      });

      // Get the GameState document to find the gameStateId
      const gameStateDoc = await GameStateModel.findOne({ campaignId }).exec();
      if (!gameStateDoc) {
        return {
          success: false,
          error: {
            code: 'GAMESTATE_NOT_FOUND',
            message: 'Game state not found for campaign'
          }
        };
      }

      // Check GM permissions unless skipped (for system updates)
      if (!skipPermissionCheck && stateUpdate.source !== 'system') {
        const campaign = await CampaignModel.findById(campaignId).exec();
        if (!campaign) {
          return {
            success: false,
            error: {
              code: 'GAMESTATE_NOT_FOUND',
              message: 'Campaign not found'
            }
          };
        }

        const isGM = campaign.gameMasterId === userId;
        if (!isGM) {
          return {
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Only the game master can update game state'
            }
          };
        }
      }

      // Update the stateUpdate with the correct gameStateId
      const fullStateUpdate: StateUpdate = {
        ...stateUpdate,
        gameStateId: gameStateDoc.id
      };

      // Use existing service to apply state update
      const response = await this.applyStateUpdate(fullStateUpdate, { 
        enableMetrics: true
      });

      // Broadcast update to all session participants if successful
      if (response.success && response.newVersion) {
        const broadcast = {
          gameStateId: gameStateDoc.id,
          operations: stateUpdate.operations,
          newVersion: response.newVersion,
          expectedHash: response.newHash || '',
          timestamp: Date.now(),
          source: stateUpdate.source || 'system'
        };

        // Find active sessions that use this campaign's GameState
        const { GameSessionModel } = await import('../models/game-session.model.mjs');
        const activeSessions = await GameSessionModel.find({ 
          campaignId, 
          status: 'active' 
        }).exec();

        // Broadcast to ALL clients in all active session rooms for this campaign
        const { SocketServer } = await import('../../../websocket/socket-server.mjs');
        const io = SocketServer.getInstance().socketIo;
        for (const session of activeSessions) {
          io.to(`session:${session.id}`).emit('gameState:updated', broadcast);
        }

        logger.info('GameState update broadcast sent', {
          campaignId,
          sessionCount: activeSessions.length,
          newVersion: response.newVersion
        });
      }

      return response;

    } catch (error) {
      logger.error('Error updating game state:', error);
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

      // Use raw MongoDB-serialized state (no parsing) to match current hash generation process
      const currentServerGameState: ServerGameStateWithVirtuals = gameState.state;
      
      // Generate fresh hash from MongoDB-serialized state (matches save process)
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