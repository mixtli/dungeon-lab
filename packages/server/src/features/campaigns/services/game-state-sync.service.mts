import mongoose from 'mongoose';
import { logger } from '../../../utils/logger.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import type { ICharacter, IActor, IItem, IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import type { z } from 'zod';
import { campaignSchema } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';

// Import backing models
import { CharacterDocumentModel } from '../../documents/models/character-document.model.mjs';
import { ActorDocumentModel } from '../../documents/models/actor-document.model.mjs';
import { ItemDocumentModel } from '../../documents/models/item-document.model.mjs';
import { EncounterModel } from '../../encounters/models/encounter.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';

/**
 * Result of a sync operation
 */
interface SyncResult {
  success: boolean;
  entitiesUpdated: {
    campaigns: number;
    characters: number;
    actors: number;
    items: number;
    encounters: number;
  };
  errors: string[];
  duration: number;
}

/**
 * Options for sync operations
 */
interface SyncOptions {
  dryRun?: boolean;          // Don't actually update, just report what would be done
  forceUpdate?: boolean;     // Update even if no changes detected
  timeout?: number;          // Max time to spend syncing (ms)
}

/**
 * Service for synchronizing unified game state back to backing models
 * Called at strategic times: session end, GM disconnect, periodic intervals
 */
export class GameStateSyncService {

  /**
   * Sync game state to backing models for a specific session
   */
  async syncGameStateToBackingModels(
    sessionId: string, 
    reason: 'session-end' | 'gm-disconnect' | 'periodic' | 'manual',
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      entitiesUpdated: { campaigns: 0, characters: 0, actors: 0, items: 0, encounters: 0 },
      errors: [],
      duration: 0
    };

    try {
      logger.info('Starting game state sync', { sessionId, reason, options });

      // Get session
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) {
        result.errors.push('Session not found');
        result.duration = Date.now() - startTime;
        return result;
      }

      const campaignId = session.campaignId;
      
      // Get game state separately (GameState is now handled by a separate model)
      const { GameStateService } = await import('./game-state.service.mjs');
      const gameStateService = new GameStateService();
      const gameStateResult = await gameStateService.getGameState(campaignId);
      
      if (!gameStateResult || !gameStateResult.gameState) {
        result.errors.push('Game state not found for campaign');
        result.duration = Date.now() - startTime;
        return result;
      }

      const gameState = gameStateResult.gameState;

      // Try to use transaction for atomicity, fallback to non-transactional for standalone MongoDB
      let syncSession: mongoose.ClientSession | null = null;
      let useTransaction = true;
      
      try {
        syncSession = await mongoose.startSession();
        
        // Test if transactions are supported
        await syncSession.withTransaction(async () => {
          // Empty transaction to test support
        });
      } catch (error) {
        // Transactions not supported (standalone MongoDB), proceed without them
        if (error instanceof Error && error.message.includes('Transaction numbers are only allowed')) {
          logger.warn('MongoDB transactions not supported, falling back to non-transactional sync');
          useTransaction = false;
          if (syncSession) {
            await syncSession.endSession();
            syncSession = null;
          }
        } else {
          throw error;
        }
      }
      
      try {
        const syncOperation = async (session: mongoose.ClientSession | null) => {
          // Sync each entity type
          result.entitiesUpdated.campaigns = await this.syncCampaign(
            gameState.campaign, 
            campaignId, 
            options, 
            session
          );
          
          // Extract characters from unified documents structure
          const characters = Object.values(gameState.documents || {}).filter(doc => doc.documentType === 'character');
          result.entitiesUpdated.characters = await this.syncCharacters(
            characters, 
            campaignId, 
            options, 
            session
          );
          
          // Extract actors from unified documents structure
          const actors = Object.values(gameState.documents || {}).filter(doc => doc.documentType === 'actor');
          result.entitiesUpdated.actors = await this.syncActors(
            actors, 
            campaignId, 
            options, 
            session
          );
          
          // Extract items from unified documents structure
          const items = Object.values(gameState.documents || {}).filter(doc => doc.documentType === 'item');
          result.entitiesUpdated.items = await this.syncItems(
            items, 
            campaignId, 
            options, 
            session
          );
          
          result.entitiesUpdated.encounters = await this.syncEncounter(
            gameState.currentEncounter, 
            campaignId, 
            options, 
            session
          );
        };

        if (useTransaction && syncSession) {
          await syncSession.withTransaction(() => syncOperation(syncSession));
        } else {
          await syncOperation(null);
        }

        result.success = true;
        logger.info('Game state sync completed successfully', { 
          sessionId, 
          reason, 
          entitiesUpdated: result.entitiesUpdated,
          duration: Date.now() - startTime,
          useTransaction
        });

      } catch (error) {
        result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.error('Game state sync failed', { sessionId, reason, error, useTransaction });
      } finally {
        if (syncSession) {
          await syncSession.endSession();
        }
      }

      } catch (error) {
        result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.error('Game state sync failed', { sessionId, reason, error });
      }

      result.duration = Date.now() - startTime;
      return result;
  }

  /**
   * Sync multiple sessions (for periodic cleanup)
   */
  async syncMultipleSessions(
    sessionIds: string[], 
    reason: 'periodic' | 'manual' = 'periodic',
    options: SyncOptions = {}
  ): Promise<{ results: SyncResult[]; summary: { total: number; successful: number; failed: number } }> {
    const results: SyncResult[] = [];
    
    logger.info('Starting batch sync', { sessionCount: sessionIds.length, reason });

    for (const sessionId of sessionIds) {
      try {
        const result = await this.syncGameStateToBackingModels(sessionId, reason, options);
        results.push(result);
        
        // Add delay between syncs to avoid overwhelming the database
        if (sessionIds.length > 1 && !options.dryRun) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        results.push({
          success: false,
          entitiesUpdated: { campaigns: 0, characters: 0, actors: 0, items: 0, encounters: 0 },
          errors: [`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          duration: 0
        });
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    logger.info('Batch sync completed', { summary, reason });
    return { results, summary };
  }

  // ============================================================================
  // PRIVATE SYNC METHODS
  // ============================================================================

  /**
   * Sync campaign from game state to Campaign document
   */
  private async syncCampaign(
    campaign: z.infer<typeof campaignSchema> | null, 
    campaignId: string, 
    options: SyncOptions,
    session: mongoose.ClientSession | null
  ): Promise<number> {
    if (!campaign) {
      return 0;
    }

    try {
      if (options.dryRun) {
        logger.debug('DRY RUN: Would sync campaign', { 
          campaignId: campaign.id, 
          name: campaign.name 
        });
        return 1;
      }

      // Update campaign document (only if it exists - don't create new campaigns from sync)
      const updateResult = await CampaignModel.updateOne(
        { _id: campaignId },
        { 
          $set: {
            ...campaign,
            updatedAt: new Date()
          }
        },
        { 
          ...(session && { session })
          // Note: No upsert for campaigns - they should already exist
        }
      ).exec();

      return updateResult.modifiedCount > 0 ? 1 : 0;

    } catch (error) {
      logger.warn('Failed to sync campaign', { 
        campaignId: campaign.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  /**
   * Sync characters from game state to Character documents
   */
  private async syncCharacters(
    characters: ICharacter[], 
    campaignId: string, 
    options: SyncOptions,
    session: mongoose.ClientSession | null
  ): Promise<number> {
    let updated = 0;

    for (const character of characters) {
      try {
        if (options.dryRun) {
          logger.debug('DRY RUN: Would sync character', { characterId: character.id, name: character.name });
          updated++;
          continue;
        }

        // Update or create character document
        const updateResult = await CharacterDocumentModel.updateOne(
          { _id: character.id },
          { 
            $set: {
              ...character,
              campaignId,
              updatedAt: new Date()
            }
          },
          { 
            upsert: true, 
            ...(session && { session }),
            setDefaultsOnInsert: true
          }
        ).exec();

        if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
          updated++;
        }

      } catch (error) {
        logger.warn('Failed to sync character', { 
          characterId: character.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return updated;
  }

  /**
   * Sync actors from game state to Actor documents
   */
  private async syncActors(
    actors: IActor[], 
    campaignId: string, 
    options: SyncOptions,
    session: mongoose.ClientSession | null
  ): Promise<number> {
    let updated = 0;

    for (const actor of actors) {
      try {
        if (options.dryRun) {
          logger.debug('DRY RUN: Would sync actor', { actorId: actor.id, name: actor.name });
          updated++;
          continue;
        }

        const updateResult = await ActorDocumentModel.updateOne(
          { _id: actor.id },
          { 
            $set: {
              ...actor,
              campaignId,
              updatedAt: new Date()
            }
          },
          { 
            upsert: true, 
            ...(session && { session }),
            setDefaultsOnInsert: true
          }
        ).exec();

        if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
          updated++;
        }

      } catch (error) {
        logger.warn('Failed to sync actor', { 
          actorId: actor.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return updated;
  }

  /**
   * Sync items from game state to Item documents
   */
  private async syncItems(
    items: IItem[], 
    campaignId: string, 
    options: SyncOptions,
    session: mongoose.ClientSession | null
  ): Promise<number> {
    let updated = 0;

    for (const item of items) {
      try {
        if (options.dryRun) {
          logger.debug('DRY RUN: Would sync item', { itemId: item.id, name: item.name });
          updated++;
          continue;
        }

        const updateResult = await ItemDocumentModel.updateOne(
          { _id: item.id },
          { 
            $set: {
              ...item,
              campaignId,
              updatedAt: new Date()
            }
          },
          { 
            upsert: true, 
            ...(session && { session }),
            setDefaultsOnInsert: true
          }
        ).exec();

        if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
          updated++;
        }

      } catch (error) {
        logger.warn('Failed to sync item', { 
          itemId: item.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return updated;
  }

  /**
   * Sync current encounter from game state to Encounter document
   */
  private async syncEncounter(
    currentEncounter: IEncounter | null, 
    campaignId: string, 
    options: SyncOptions,
    session: mongoose.ClientSession | null
  ): Promise<number> {
    if (!currentEncounter) {
      return 0;
    }

    try {
      if (options.dryRun) {
        logger.debug('DRY RUN: Would sync encounter', { 
          encounterId: currentEncounter.id, 
          name: currentEncounter.name 
        });
        return 1;
      }

      const updateResult = await EncounterModel.updateOne(
        { _id: currentEncounter.id },
        { 
          $set: {
            ...currentEncounter,
            campaignId,
            updatedAt: new Date()
          }
        },
        { 
          upsert: true, 
          ...(session && { session }),
          setDefaultsOnInsert: true
        }
      ).exec();

      return updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0 ? 1 : 0;

    } catch (error) {
      logger.warn('Failed to sync encounter', { 
        encounterId: currentEncounter.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  /**
   * Get sessions that need periodic sync
   */
  async getSessionsNeedingSync(
    maxAge: number = 1000 * 60 * 30 // 30 minutes
  ): Promise<string[]> {
    try {
      const cutoffTime = Date.now() - maxAge;
      
      const sessions = await GameSessionModel.find({
        status: 'active',
        gameState: { $ne: null },
        lastStateUpdate: { $lt: cutoffTime }
      }).select('_id').exec();

      return sessions.map(s => s.id);
    } catch (error) {
      logger.error('Failed to get sessions needing sync', { error });
      return [];
    }
  }

  /**
   * Sync a single encounter from game state to backing model
   * Public method for targeted encounter syncing
   */
  async syncSingleEncounter(
    currentEncounter: IEncounter | null,
    campaignId: string,
    options: SyncOptions = {}
  ): Promise<{ success: boolean; updated: boolean; error?: string }> {
    try {
      const updated = await this.syncEncounter(currentEncounter, campaignId, options, null);
      return {
        success: true,
        updated: updated > 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to sync single encounter', { 
        encounterId: currentEncounter?.id, 
        campaignId, 
        error: errorMessage 
      });
      return {
        success: false,
        updated: false,
        error: errorMessage
      };
    }
  }

  /**
   * Clean up backing models for ended sessions
   */
  async cleanupEndedSessions(sessionIds: string[]): Promise<void> {
    // TODO: Implement cleanup logic for ended sessions
    // This could involve archiving or removing stale data
    logger.info('Cleanup for ended sessions requested', { sessionCount: sessionIds.length });
  }
}