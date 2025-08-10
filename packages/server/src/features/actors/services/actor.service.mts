import { IActor, IActorCreateData } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { AssetModel } from '../../../features/assets/models/asset.model.mjs';
import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { deepMerge, generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import { UserModel } from '../../../models/user.model.mjs';
import { IActorPatchData } from '@dungeon-lab/shared/types/index.mjs';
import mongoose from 'mongoose';
import { createSearchParams } from '../../../utils/create.search.params.mjs';

// Define a type for actor query values
export type QueryValue = string | number | boolean | RegExp | Date | object;

export class ActorService {

  async getAllActors(type?: string): Promise<IActor[]> {
    try {
      const filter = type ? { documentType: 'actor', pluginDocumentType: type } : { documentType: 'actor' };
      const actors = await DocumentService.find<IActor>(filter, { populate: ['avatar', 'defaultTokenImage'] });
      return actors;
    } catch (error) {
      logger.error('Error fetching actors:', error);
      throw new Error('Failed to get actors');
    }
  }

  async getActorById(id: string): Promise<IActor> {
    try {
      const actor = await DocumentService.findById<IActor>(id, { populate: ['avatar', 'defaultTokenImage'] });
      if (!actor) {
        throw new Error('Actor not found');
      }
      return actor;
    } catch (error) {
      logger.error('Error fetching actor:', error);
      throw new Error('Failed to get actor');
    }
  }

  async getActors(campaignId: string): Promise<IActor[]> {
    try {
      const filter = { campaignId, documentType: 'actor' };
      const actors = await DocumentService.find<IActor>(filter, { populate: ['avatar', 'defaultTokenImage'] });
      return actors;
    } catch (error) {
      logger.error('Error getting actors:', error);
      throw new Error('Failed to get actors');
    }
  }

  /**
   * Create an actor with optional avatar and token files
   *
   * @param data - The actor data
   * @param userId - ID of the user creating the actor
   * @param avatarFile - Optional avatar file for the actor
   * @param tokenFile - Optional token file for the actor
   */
  async createActor(
    data: Omit<IActorCreateData, 'token'>,
    userId: string,
    tokenFile?: File
  ): Promise<IActor> {
    try {
      const actorData = {
        ...data,
        slug: data.slug || generateSlug(data.name),
        createdBy: userId,
        updatedBy: userId
      };

      // This allows admins to create actors for other users
      const user = await UserModel.findById(userId);
      if (user?.isAdmin && 'createdBy' in data && typeof data.createdBy === 'string') {
        actorData.createdBy = data.createdBy;
      }

      // Create actor in database to get an ID
      const actor = await DocumentService.create<IActor>(actorData);

      // Note: Avatar functionality removed - actors no longer have avatars
      // Handle token file if provided
      if (tokenFile) {
        logger.info('Uploading provided actor token');

        // Create asset using the createAsset method
        const tokenAsset = await createAsset(tokenFile, 'actors/tokens', userId);

        // Update the actor with the token ID
        await DocumentService.updateById<IActor>(actor.id, { tokenImageId: tokenAsset.id });
      } else {
        this.generateActorToken(actor.id, userId);
      }
      // Return the actor with populated avatar and token
      const updatedActor = await DocumentService.findById<IActor>(actor.id, { populate: ['avatar', 'defaultTokenImage'] });
      if (!updatedActor) {
        throw new Error('Actor not found after creation');
      }
      return updatedActor;
    } catch (error) {
      logger.error('Error creating actor:', error);
      throw new Error('Failed to create actor');
    }
  }

  /**
   * Update an actor with optional new avatar and token files (full replacement)
   *
   * @param id - The ID of the actor to update
   * @param data - New data for the actor
   * @param userId - ID of the user updating the actor
   * @param avatarFile - Optional new avatar file
   * @param tokenFile - Optional new token file
   */
  async putActor(
    id: string,
    data: Omit<IActorCreateData, 'token'>,
    userId: string,
    tokenFile?: File
  ): Promise<IActor> {
    try {
      const actor = await DocumentService.findById<IActor>(id);
      if (!actor) {
        throw new Error('Actor not found');
      }

      const updateData: Record<string, unknown> = {
        ...data,
        slug: data.slug || generateSlug(data.name),
        updatedBy: userId
      };

      // Handle avatar file if provided
      if (avatarFile) {
        logger.info(`Updating actor ${id} with new avatar`);

        // Create asset using the createAsset method
        const newAvatarAsset = await createAsset(avatarFile, 'actors', userId);

        // Delete the old avatar asset if it exists and is different
        if (actor.avatarId && actor.avatarId.toString() !== newAvatarAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(actor.avatarId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old avatar asset ${actor.avatarId} for actor ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old avatar asset ${actor.avatarId}:`, deleteError);
          }
        }

        // Update avatar ID in actor data
        updateData.avatarId = newAvatarAsset.id;
      }

      // Handle token file if provided
      if (tokenFile) {
        logger.info(`Updating actor ${id} with new token`);

        // Create asset using the createAsset method
        const newTokenAsset = await createAsset(tokenFile, 'actors/tokens', userId);

        // Delete the old token asset if it exists and is different
        if (actor.tokenImageId && actor.tokenImageId.toString() !== newTokenAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(actor.tokenImageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old token asset ${actor.tokenImageId} for actor ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old token asset ${actor.tokenImageId}:`, deleteError);
          }
        }

        // Update token ID in actor data
        updateData.tokenImageId = newTokenAsset.id;
      }

      // Set the entire actor data (full replacement)
      const updatedActor = await DocumentService.updateById<IActor>(id, updateData);
      if (!updatedActor) {
        throw new Error('Failed to update actor');
      }

      // Return with populated fields
      const actorWithPopulation = await DocumentService.findById<IActor>(id, { populate: ['avatar', 'defaultTokenImage'] });
      if (!actorWithPopulation) {
        throw new Error('Actor not found after update');
      }
      return actorWithPopulation;
    } catch (error) {
      logger.error('Error updating actor:', error);
      throw new Error('Failed to update actor');
    }
  }

  /**
   * Partially update an actor with optional new avatar and token files
   *
   * @param id - The ID of the actor to update
   * @param data - Partial data for the actor
   * @param userId - ID of the user updating the actor
   * @param avatarFile - Optional new avatar file
   * @param tokenFile - Optional new token file
   */
  async patchActor(
    id: string,
    data: IActorPatchData,
    userId: string,
    avatarFile?: File,
    tokenFile?: File
  ): Promise<IActor> {
    try {
      const actor = await DocumentService.findById<IActor>(id);
      if (!actor) {
        throw new Error('Actor not found');
      }

      const updateData = {
        ...data,
        updatedBy: userId
      };

      // Handle avatar file if provided
      if (avatarFile) {
        logger.info(`Updating actor ${id} with new avatar`);

        // Create asset using the createAsset method
        const newAvatarAsset = await createAsset(avatarFile, 'actors', userId);

        // Delete the old avatar asset if it exists and is different
        if (actor.avatarId && actor.avatarId.toString() !== newAvatarAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(actor.avatarId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old avatar asset ${actor.avatarId} for actor ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old avatar asset ${actor.avatarId}:`, deleteError);
          }
        }

        // Update avatar ID in actor data
        updateData.avatarId = newAvatarAsset.id;
      }

      // Handle token file if provided
      if (tokenFile) {
        logger.info(`Updating actor ${id} with new token`);

        // Create asset using the createAsset method
        const newTokenAsset = await createAsset(tokenFile, 'actors/tokens', userId);

        // Delete the old token asset if it exists and is different
        if (actor.tokenImageId && actor.tokenImageId.toString() !== newTokenAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(actor.tokenImageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old token asset ${actor.tokenImageId} for actor ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old token asset ${actor.tokenImageId}:`, deleteError);
          }
        }

        // Update token ID in actor data
        updateData.tokenImageId = newTokenAsset.id;
      }

      // Use deepMerge to only update the specified fields
      const obj = actor;
      const mergedData = deepMerge(obj, updateData);
      
      const updatedActor = await DocumentService.updateById<IActor>(id, mergedData);
      if (!updatedActor) {
        throw new Error('Failed to update actor');
      }

      // Return with populated fields
      const actorWithPopulation = await DocumentService.findById<IActor>(id, { populate: ['avatar', 'defaultTokenImage'] });
      if (!actorWithPopulation) {
        throw new Error('Actor not found after update');
      }
      return actorWithPopulation;
    } catch (error) {
      logger.error('Error patching actor:', error);
      throw new Error('Failed to patch actor');
    }
  }

  /**
   * Update an actor's avatar with a file
   * @param id - The ID of the actor to update
   * @param file - The file object
   * @param userId - ID of the user updating the actor
   */
  async updateActorAvatar(id: string, file: File, userId: string): Promise<IActor> {
    try {
      // Get existing actor
      const existingActor = await DocumentService.findById<IActor>(id);
      if (!existingActor) {
        throw new Error('Actor not found');
      }

      // Create the asset
      const newAvatarAsset = await createAsset(file, 'actors/avatars', userId);

      // Delete the old avatar asset if it exists and is different
      if (
        existingActor.avatarId &&
        existingActor.avatarId.toString() !== newAvatarAsset.id.toString()
      ) {
        try {
          const oldAsset = await AssetModel.findById(existingActor.avatarId);
          if (oldAsset) {
            await oldAsset.deleteOne();
            logger.info(`Deleted old avatar asset ${existingActor.avatarId} for actor ${id}`);
          }
        } catch (deleteError) {
          logger.warn(`Could not delete old avatar asset ${existingActor.avatarId}:`, deleteError);
        }
      }

      // Update the actor with the new avatar ID
      const updatedActor = await DocumentService.updateById<IActor>(
        id,
        {
          avatarId: newAvatarAsset.id,
          updatedBy: userId
        }
      );

      if (!updatedActor) {
        throw new Error('Actor not found after update');
      }

      // Return with populated fields
      const actorWithPopulation = await DocumentService.findById<IActor>(id, { populate: ['avatar', 'defaultTokenImage'] });
      if (!actorWithPopulation) {
        throw new Error('Actor not found after update');
      }

      return actorWithPopulation;
    } catch (error) {
      logger.error(`Error updating actor avatar ${id}:`, error);
      if (error instanceof Error && error.message.includes('Actor not found')) {
        throw error;
      }
      throw new Error(
        `Failed to update actor avatar: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update an actor's token with a file
   * @param id - The ID of the actor to update
   * @param file - The file object
   * @param userId - ID of the user updating the actor
   */
  async updateActorToken(id: string, file: File, userId: string): Promise<IActor> {
    try {
      // Get existing actor
      const existingActor = await DocumentService.findById<IActor>(id);
      if (!existingActor) {
        throw new Error('Actor not found');
      }

      // Create the asset
      const newTokenAsset = await createAsset(file, 'actors/tokens', userId);

      // Delete the old token asset if it exists and is different
      if (
        existingActor.tokenImageId &&
        existingActor.tokenImageId.toString() !== newTokenAsset.id.toString()
      ) {
        try {
          const oldAsset = await AssetModel.findById(existingActor.tokenImageId);
          if (oldAsset) {
            await oldAsset.deleteOne();
            logger.info(`Deleted old token asset ${existingActor.tokenImageId} for actor ${id}`);
          }
        } catch (deleteError) {
          logger.warn(`Could not delete old token asset ${existingActor.tokenImageId}:`, deleteError);
        }
      }

      // Update the actor with the new token ID
      const updatedActor = await DocumentService.updateById<IActor>(
        id,
        {
          tokenImageId: newTokenAsset.id,
          updatedBy: userId
        }
      );

      if (!updatedActor) {
        throw new Error('Actor not found after update');
      }

      // Return with populated fields
      const actorWithPopulation = await DocumentService.findById<IActor>(id, { populate: ['avatar', 'defaultTokenImage'] });
      if (!actorWithPopulation) {
        throw new Error('Actor not found after update');
      }

      return actorWithPopulation;
    } catch (error) {
      logger.error(`Error updating actor token ${id}:`, error);
      if (error instanceof Error && error.message.includes('Actor not found')) {
        throw error;
      }
      throw new Error(
        `Failed to update actor token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deleteActor(id: string): Promise<void> {
    try {
      const success = await DocumentService.deleteById(id);
      if (!success) {
        throw new Error('Actor not found');
      }
    } catch (error) {
      logger.error('Error deleting actor:', error);
      throw new Error('Failed to delete actor');
    }
  }

  async checkUserPermission(actorId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const actor = await DocumentService.findById<IActor>(actorId);
      if (!actor) {
        throw new Error('Actor not found');
      }

      return actor.createdBy?.toString() === userId || isAdmin;
    } catch (error) {
      logger.error('Error checking user permission:', error);
      throw new Error('Failed to check user permission');
    }
  }

  /**
   * Generate an actor's avatar
   * @param actorId - The ID of the actor
   * @param userId - ID of the user requesting the avatar generation
   */
  async generateActorAvatar(actorId: string, userId: string): Promise<void> {
    await this.scheduleImageGeneration(actorId, 'avatar', userId);
  }

  /**
   * Generate an actor's token
   * @param actorId - The ID of the actor
   * @param userId - ID of the user requesting the token generation
   */
  async generateActorToken(actorId: string, userId: string): Promise<void> {
    await this.scheduleImageGeneration(actorId, 'token', userId);
  }

  /**
   * Search actors based on query parameters
   * @param query Query object with search parameters
   * @returns Array of actors matching the search criteria
   */
  async searchActors(query: Record<string, QueryValue>): Promise<IActor[]> {
    try {
      // Extract campaignId for special handling
      const campaignId = query.campaignId as string;
      const queryCopy = { ...query };

      // Remove campaignId from direct query since we'll handle it separately
      if (campaignId) {
        delete queryCopy.campaignId;
      }
      const params = createSearchParams(queryCopy);

      // Convert query to case-insensitive regex for string values
      // Only convert simple string values, not nested paths
      // const mongoQuery = Object.entries(queryCopy).reduce((acc, [key, value]) => {
      //   if (typeof value === 'string' && !key.includes('.')) {
      //     acc[key] = new RegExp(value, 'i');
      //   } else {
      //     acc[key] = value;
      //   }
      //   return acc;
      // }, {} as Record<string, QueryValue>);

      if (campaignId) {
        // If campaignId is provided, we need to filter actors that are members of the campaign
        const CampaignModel = mongoose.model('Campaign');

        // Find the campaign to get its members
        const campaign = await CampaignModel.findById(campaignId);
        if (!campaign) {
          logger.warn(`Campaign not found with ID: ${campaignId}`);
          return [];
        }

        // Filter by campaignId to get characters in this campaign
        params.campaignId = campaignId;
      }

      // Execute the query with all conditions
      return await DocumentService.find<IActor>(params, { populate: ['avatar', 'defaultTokenImage'] });
    } catch (error) {
      logger.error('Error searching actors:', error);
      throw new Error('Failed to search actors');
    }
  }

  /**
   * Update actor with generated image asset ID
   * @param actorId - The ID of the actor to update
   * @param imageType - Type of image ('avatar' or 'token')
   * @param assetId - Asset ID of the generated image
   * @param userId - ID of the user updating the actor
   */
  async updateDocumentImage(
    actorId: string,
    imageType: 'avatar' | 'token',
    assetId: string,
    userId: string
  ): Promise<void> {
    const field = imageType === 'avatar' ? 'avatarId' : 'tokenImageId';
    await DocumentService.updateById<IActor>(actorId, {
      [field]: assetId,
      updatedBy: userId
    });
    logger.info(`Updated actor ${actorId} with ${imageType} asset ${assetId}`);
  }

  /**
   * Schedule image generation for an actor
   * @param actorId - The ID of the actor
   * @param imageType - Type of image to generate
   * @param userId - ID of the user requesting generation
   * @param customPrompt - Optional custom prompt
   */
  async scheduleImageGeneration(
    actorId: string,
    imageType: 'avatar' | 'token',
    userId: string,
    customPrompt?: string
  ): Promise<void> {
    const { DOCUMENT_IMAGE_GENERATION_JOB } = await import('../../documents/jobs/document-image.job.mjs');
    
    await backgroundJobService.scheduleJob('now', DOCUMENT_IMAGE_GENERATION_JOB, {
      documentId: actorId,
      imageType,
      userId,
      customPrompt
    });

    logger.info(`Scheduled ${imageType} generation job for actor ${actorId}`);
  }
}
