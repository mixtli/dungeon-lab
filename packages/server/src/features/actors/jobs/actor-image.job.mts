import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { ActorDocumentModel } from '../../documents/models/actor-document.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { generateActorAvatar, generateActorToken } from '../utils/actor-image-generator.mjs';
import type { Job } from '@pulsecron/pulse';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';

// Job names
export const ACTOR_AVATAR_GENERATION_JOB = 'generate-actor-avatar';
export const ACTOR_TOKEN_GENERATION_JOB = 'generate-actor-token';

/**
 * Register job handlers for actor-related background jobs
 */
export async function registerActorImageJobs(): Promise<void> {
  logger.info('Registering actor avatar and token job handlers...');
  const ActorModel = ActorDocumentModel;
  
  // Register actor avatar generation job
  backgroundJobService.defineJob(
    ACTOR_AVATAR_GENERATION_JOB,
    async (job: Job): Promise<void> => {
      const { actorId, userId } = job.attrs.data as { actorId: string; userId: string };
      
      if (!actorId || !userId) {
        throw new Error('Actor ID and User ID are required for avatar generation');
      }
      
      logger.info(`Starting avatar generation job for actor ${actorId}`);
      
      // Get the actor document
      const actor = await ActorModel.findById(actorId);
      if (!actor) {
        throw new Error(`Actor not found with ID: ${actorId}`);
      }
      
      try {
        // Generate the actor avatar using AI
        const avatarFile = await generateActorAvatar(actor);
        const avatarAsset = await createAsset(avatarFile, 'actors', userId);
        
        // Update the actor with the avatar ID
        actor.avatarId = avatarAsset.id;
        await actor.save();
        
        logger.info(`Actor avatar generated successfully for actor ${actorId}`);
        
      } catch (error) {
        logger.error(`Error generating avatar for actor ${actorId}:`, error);
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 2, // Limit concurrent image generations
      attempts: 3
    }
  );
  
  // Register actor token generation job
  backgroundJobService.defineJob(
    ACTOR_TOKEN_GENERATION_JOB,
    async (job: Job): Promise<void> => {
      const { actorId, userId } = job.attrs.data as { 
        actorId: string; 
        userId: string;
      };
      
      if (!actorId || !userId) {
        throw new Error('Actor ID and User ID are required for token generation');
      }
      
      logger.info(`Starting token generation job for actor ${actorId}`);
      
      // Get the actor document
      const actor = await ActorModel.findById(actorId);
      if (!actor) {
        throw new Error(`Actor not found with ID: ${actorId}`);
      }
      
      try {
        // Generate the actor token using AI
        const tokenFile = await generateActorToken(actor);
        const tokenAsset = await createAsset(tokenFile, 'actors/tokens', userId);
        
        // Update the actor with the token ID
        actor.defaultTokenImageId = tokenAsset.id;
        actor.updatedBy = userId;
        await actor.save();
        
        logger.info(`Actor token generated successfully for actor ${actorId}`);
      } catch (error) {
        logger.error(`Error generating token for actor ${actorId}:`, error);
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 2,
      attempts: 3
    }
  );
  
  logger.info(`Actor image jobs registered:
  - ${ACTOR_AVATAR_GENERATION_JOB}: Generates AI avatars for actors
  - ${ACTOR_TOKEN_GENERATION_JOB}: Generates AI tokens for actors`);
} 