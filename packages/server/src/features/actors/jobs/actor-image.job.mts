import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { generateActorAvatar, generateActorToken } from '../utils/actor-image-generator.mjs';
import type { Job } from '@pulsecron/pulse';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

// Job names
export const ACTOR_AVATAR_GENERATION_JOB = 'generate-actor-avatar';
export const ACTOR_TOKEN_GENERATION_JOB = 'generate-actor-token';

/**
 * Register job handlers for actor-related background jobs
 */
export async function registerActorImageJobs(): Promise<void> {
  logger.info('Registering actor avatar and token job handlers...');
  
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
      const actor = await DocumentService.findById<IActor>(actorId);
      if (!actor || actor.documentType !== 'actor') {
        throw new Error(`Actor not found with ID: ${actorId}`);
      }
      
      try {
        // Generate the actor avatar using AI
        const avatarFile = await generateActorAvatar(actor);
        const avatarAsset = await createAsset(avatarFile, 'actors', userId);
        
        // Update the actor with the avatar ID
        await DocumentService.updateById(actorId, { avatarId: avatarAsset.id });
        
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
      const actor = await DocumentService.findById<IActor>(actorId);
      if (!actor || actor.documentType !== 'actor') {
        throw new Error(`Actor not found with ID: ${actorId}`);
      }
      
      try {
        // Generate the actor token using AI
        const tokenFile = await generateActorToken(actor);
        const tokenAsset = await createAsset(tokenFile, 'actors/tokens', userId);
        
        // Update the actor with the token ID
        await DocumentService.updateById(actorId, { 
          defaultTokenImageId: tokenAsset.id,
          updatedBy: userId 
        });
        
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