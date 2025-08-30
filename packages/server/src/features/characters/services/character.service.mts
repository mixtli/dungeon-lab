import type { ICharacter, StateUpdate, JsonPatchOperation } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { DocumentModel } from '../../documents/models/document.model.mjs';
import { ItemDocumentModel } from '../../documents/models/item-document.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { GameStateService } from '../../campaigns/services/game-state.service.mjs';

export class CharacterService {

  /**
   * Update character with generated image asset ID
   * @param characterId - The ID of the character to update
   * @param imageType - Type of image ('avatar' or 'token')  
   * @param assetId - Asset ID of the generated image
   * @param userId - ID of the user updating the character
   */
  async updateDocumentImage(
    characterId: string,
    imageType: 'avatar' | 'token',
    assetId: string,
    userId: string
  ): Promise<void> {
    const field = imageType === 'avatar' ? 'avatarId' : 'tokenImageId';
    await DocumentService.updateById<ICharacter>(characterId, {
      [field]: assetId,
      updatedBy: userId
    });
    logger.info(`Updated character ${characterId} with ${imageType} asset ${assetId}`);
  }

  /**
   * Schedule image generation for a character
   * @param characterId - The ID of the character
   * @param imageType - Type of image to generate
   * @param userId - ID of the user requesting generation
   * @param customPrompt - Optional custom prompt
   */
  async scheduleImageGeneration(
    characterId: string,
    imageType: 'avatar' | 'token',
    userId: string,
    customPrompt?: string
  ): Promise<void> {
    const { DOCUMENT_IMAGE_GENERATION_JOB } = await import('../../documents/jobs/document-image.job.mjs');
    
    await backgroundJobService.scheduleJob('now', DOCUMENT_IMAGE_GENERATION_JOB, {
      documentId: characterId,
      imageType,
      userId,
      customPrompt
    });

    logger.info(`Scheduled ${imageType} generation job for character ${characterId}`);
  }

  /**
   * Add character to campaign and update game state if needed
   * @param characterId - The ID of the character to add
   * @param campaignId - The ID of the campaign to join
   * @param userId - ID of the user adding the character
   */
  async joinCampaign(
    characterId: string,
    campaignId: string,
    userId: string
  ): Promise<void> {
    // Use the existing character service method to join campaign
    const updatedCharacter = await DocumentService.character.joinCampaign(characterId, campaignId);
    if (!updatedCharacter) {
      throw new Error('Character not found');
    }

    // Get the character with populated assets for gameState (raw Mongoose document with toJSON method)
    const populatedCharacterDoc = await DocumentModel.findById(characterId)
      .populate(['avatar', 'tokenImage', 'image', 'thumbnail']).exec();
    if (!populatedCharacterDoc) {
      throw new Error('Character not found after update');
    }

    // Find and update all items belonging to this character
    const characterItems = await ItemDocumentModel.find({ carrierId: characterId });
    if (characterItems.length > 0) {
      // Update all character items with the campaignId
      await ItemDocumentModel.updateMany(
        { carrierId: characterId },
        { campaignId }
      );
      
      logger.info(`Updated ${characterItems.length} items for character ${characterId} to join campaign ${campaignId}`);
    }

    // Update game state if there's an active encounter
    try {
      const gameStateService = new GameStateService();
      const gameStateResult = await gameStateService.getGameState(campaignId);
      
      if (gameStateResult?.gameState?.currentEncounter) {
        const operations: JsonPatchOperation[] = [];
        
        // Add character to encounter participants if not already there
        const participants = gameStateResult.gameState.currentEncounter.participants;
        if (!participants.includes(characterId)) {
          operations.push({
            op: 'add',
            path: `/currentEncounter/participants/${participants.length}`,
            value: characterId
          });
        }

        // Add character document to gameState documents if not already there
        if (!gameStateResult.gameState.documents[characterId]) {
          operations.push({
            op: 'add',
            path: `/documents/${characterId}`,
            value: populatedCharacterDoc.toJSON()
          });
        }

        // Add character's items to gameState documents if not already there
        for (const item of characterItems) {
          if (!gameStateResult.gameState.documents[item.id]) {
            // Get the item with populated assets for gameState
            const populatedItemDoc = await DocumentModel.findById(item.id)
              .populate(['image', 'thumbnail']).exec();
            
            if (populatedItemDoc) {
              operations.push({
                op: 'add',
                path: `/documents/${item.id}`,
                value: populatedItemDoc.toJSON()
              });
            }
          }
        }

        // Apply operations if any
        if (operations.length > 0) {
          const stateUpdate: StateUpdate = {
            id: `character-join-${characterId}-${Date.now()}`,
            gameStateId: '', // Will be set by service
            version: gameStateResult.gameStateVersion,
            operations,
            source: 'system',
            timestamp: Date.now()
          };

          const updateResult = await gameStateService.updateGameState(
            campaignId,
            stateUpdate, 
            userId,
            true // Skip permission check for system updates
          );

          if (updateResult.success) {
            logger.info(`Character ${characterId} and ${characterItems.length} items added to current encounter in campaign ${campaignId}`);
          } else {
            logger.warn(`Failed to add character to encounter: ${updateResult.error?.message}`);
          }
        }
      }
    } catch (error) {
      logger.warn(`Could not update game state for character joining campaign: ${error}`);
      // Don't fail the whole operation if game state update fails
    }

    logger.info(`Character ${characterId} and ${characterItems.length} items joined campaign ${campaignId}`);
  }

  /**
   * Remove character from campaign and update game state if needed
   * @param characterId - The ID of the character to remove
   * @param userId - ID of the user removing the character
   */
  async leaveCampaign(
    characterId: string,
    userId: string
  ): Promise<void> {
    // Get character document to find campaignId before removing
    const character = await DocumentService.findById<ICharacter>(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const campaignId = character.campaignId;
    if (!campaignId) {
      throw new Error('Character is not in a campaign');
    }

    // Remove character from campaign
    const updatedCharacter = await DocumentService.character.leaveCampaign(characterId);
    if (!updatedCharacter) {
      throw new Error('Character not found');
    }

    // Update game state if there's an active encounter
    try {
      const gameStateService = new GameStateService();
      const gameStateResult = await gameStateService.getGameState(campaignId);
      
      if (gameStateResult?.gameState?.currentEncounter) {
        const operations: JsonPatchOperation[] = [];
        
        // Remove character from encounter participants
        const participants = gameStateResult.gameState.currentEncounter.participants;
        const participantIndex = participants.indexOf(characterId);
        if (participantIndex !== -1) {
          operations.push({
            op: 'remove',
            path: `/currentEncounter/participants/${participantIndex}`
          });
        }

        // Remove character document from gameState documents
        if (gameStateResult.gameState.documents[characterId]) {
          operations.push({
            op: 'remove',
            path: `/documents/${characterId}`
          });
        }

        // Apply operations if any
        if (operations.length > 0) {
          const stateUpdate: StateUpdate = {
            id: `character-leave-${characterId}-${Date.now()}`,
            gameStateId: '', // Will be set by service
            version: gameStateResult.gameStateVersion,
            operations,
            source: 'system',
            timestamp: Date.now()
          };

          const updateResult = await gameStateService.updateGameState(
            campaignId,
            stateUpdate, 
            userId,
            true // Skip permission check for system updates
          );

          if (updateResult.success) {
            logger.info(`Character ${characterId} removed from current encounter in campaign ${campaignId}`);
          } else {
            logger.warn(`Failed to remove character from encounter: ${updateResult.error?.message}`);
          }
        }
      }
    } catch (error) {
      logger.warn(`Could not update game state for character leaving campaign: ${error}`);
      // Don't fail the whole operation if game state update fails
    }

    logger.info(`Character ${characterId} left campaign ${campaignId}`);
  }
}