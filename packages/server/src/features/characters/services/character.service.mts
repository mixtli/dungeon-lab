import type { ICharacter } from '@dungeon-lab/shared/types/index.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { backgroundJobService } from '../../../services/background-job.service.mjs';

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
    const field = imageType === 'avatar' ? 'avatarId' : 'defaultTokenImageId';
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
}