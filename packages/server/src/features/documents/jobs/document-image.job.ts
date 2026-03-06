import { backgroundJobService } from '../../../services/background-job.service.js';
import { DocumentService } from '../services/document.service.js';
import { logger } from '../../../utils/logger.js';
import { generateDocumentImage, type ImageType } from '../../../utils/document-image-generator.js';
import type { Job } from '@pulsecron/pulse';
import { createAsset } from '../../../utils/asset-upload.utils.js';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.js';

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
 * Update document with generated image asset ID using DocumentService
 */
async function updateDocumentImage(
  document: BaseDocument,
  imageType: ImageType,
  assetId: string,
  userId: string
): Promise<void> {
  let updateData: Record<string, unknown>;

  switch (document.documentType) {
    case 'actor': {
      if (imageType !== 'token') {
        throw new Error(`Actors only support token images, not ${imageType}`);
      }
      updateData = {
        tokenImageId: assetId,
        updatedBy: userId
      };
      break;
    }
    case 'character': {
      if (imageType === 'avatar') {
        updateData = {
          avatarImageId: assetId,
          updatedBy: userId
        };
      } else if (imageType === 'token') {
        updateData = {
          tokenImageId: assetId,
          updatedBy: userId
        };
      } else {
        throw new Error(`Unsupported image type for characters: ${imageType}`);
      }
      break;
    }
    case 'item': {
      if (imageType !== 'image') {
        throw new Error(`Unsupported image type for items: ${imageType}. Only 'image' is supported.`);
      }
      updateData = {
        imageId: assetId,
        updatedBy: userId
      };
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

  // Update the document using DocumentService
  await DocumentService.updateById(document.id, updateData);
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