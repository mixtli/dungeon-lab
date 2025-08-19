import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { DocumentService } from '../services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { generateDocumentImage, type ImageType } from '../../../utils/document-image-generator.mjs';
import type { Job } from '@pulsecron/pulse';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

// Job name
export const DOCUMENT_IMAGE_GENERATION_JOB = 'generate-document-image';

// Job data interface
interface DocumentImageJobData {
  documentId: string;
  userId: string;
  imageType: ImageType;
  customPrompt?: string;
}

/**
 * Update document with generated image asset ID by delegating to appropriate service
 */
async function updateDocumentImage(
  document: BaseDocument,
  imageType: ImageType,
  assetId: string,
  userId: string
): Promise<void> {
  switch (document.documentType) {
    case 'actor': {
      if (imageType !== 'token') {
        throw new Error(`Actors only support token images, not ${imageType}`);
      }
      // Import ActorService dynamically to avoid circular dependencies
      const { ActorService } = await import('../../actors/services/actor.service.mjs');
      const actorService = new ActorService();
      await actorService.updateDocumentImage(document.id, imageType, assetId, userId);
      break;
    }
    case 'character': {
      if (imageType !== 'avatar' && imageType !== 'token') {
        throw new Error(`Unsupported image type for characters: ${imageType}`);
      }
      // Import CharacterService dynamically to avoid circular dependencies
      const { CharacterService } = await import('../../characters/services/character.service.mjs');
      const characterService = new CharacterService();
      await characterService.updateDocumentImage(document.id, imageType, assetId, userId);
      break;
    }
    case 'item': {
      if (imageType !== 'image') {
        throw new Error(`Unsupported image type for items: ${imageType}. Only 'image' is supported.`);
      }
      // Import ItemService dynamically to avoid circular dependencies
      const { ItemService } = await import('../../items/services/item.service.mjs');
      const itemService = new ItemService();
      await itemService.updateDocumentImage(document.id, imageType, assetId, userId);
      break;
    }
    case 'vtt-document':
      // VTT documents don't currently support image generation
      throw new Error('Image generation not supported for VTT documents');
    default: {
      const exhaustiveCheck: never = document;
      throw new Error(`Unsupported document type for image generation: ${(exhaustiveCheck as BaseDocument).documentType}`);
    }
  }
}

/**
 * Register universal document image generation job
 */
export async function registerDocumentImageJobs(): Promise<void> {
  logger.info('Registering universal document image generation job...');
  
  backgroundJobService.defineJob(
    DOCUMENT_IMAGE_GENERATION_JOB,
    async (job: Job): Promise<void> => {
      const { documentId, userId, imageType, customPrompt } = job.attrs.data as DocumentImageJobData;
      
      if (!documentId || !userId || !imageType) {
        throw new Error('Document ID, User ID, and Image Type are required for image generation');
      }
      
      logger.info(`Starting ${imageType} image generation job for document ${documentId}`);
      
      // Get the document
      const document = await DocumentService.findById<BaseDocument>(documentId);
      if (!document) {
        throw new Error(`Document not found with ID: ${documentId}`);
      }
      
      try {
        // Generate the image using AI
        const imageFile = await generateDocumentImage(document, imageType, { customPrompt });
        
        // Create asset with appropriate folder structure
        const folderPath = `${document.documentType}s${imageType === 'token' ? '/tokens' : ''}`;
        const imageAsset = await createAsset(imageFile, folderPath, userId);
        
        // Update the document with the new image asset ID using appropriate service
        await updateDocumentImage(document, imageType, imageAsset.id, userId);
        
        logger.info(`${imageType} image generated successfully for ${document.documentType} ${documentId}`);
        
      } catch (error) {
        logger.error(`Error generating ${imageType} image for document ${documentId}:`, error);
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 2, // Limit concurrent image generations to avoid overwhelming OpenAI API
      attempts: 3
    }
  );
  
  logger.info(`Universal document image generation job registered:
  - ${DOCUMENT_IMAGE_GENERATION_JOB}: Generates AI images for any document type (actor, character, item)`);
} 