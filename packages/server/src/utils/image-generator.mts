import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
import storageService from '../services/storage.service.mjs';
import { logger } from './logger.mjs';

// Generic function to generate and process an AI image
export async function generateAIImage(
  prompt: string,
  data: Record<string, unknown>,
  size: '256x256' | '512x512' | '1024x1024',
  options: {
    entityId: string;
    fileName: string;
    folder: string;
    processImage?: (buffer: Buffer) => Promise<Buffer>;
    contentType?: string;
  }
): Promise<{ url: string; path: string; size: number; type: string }> {
  try {
    logger.info(`Generating image with prompt: ${prompt} with data ${JSON.stringify(data)}`);
    
    const { image } = await generateImage({
      model: openai.image('dall-e-3'),
      prompt: `${prompt} Details: ${JSON.stringify(data)}`,
      size
    });

    if (!image.uint8Array) {
      throw new Error('Failed to generate image');
    }

    let processedBuffer = Buffer.from(image.uint8Array);

    // Apply custom image processing if provided
    if (options.processImage) {
      processedBuffer = await options.processImage(processedBuffer);
    }

    // Upload to storage
    const contentType = options.contentType || 'image/jpeg';
    const uploadResult = await storageService.uploadFile(
      processedBuffer,
      options.fileName,
      contentType,
      options.folder
    );

    return {
      url: storageService.getPublicUrl(uploadResult.key),
      path: uploadResult.key,
      size: uploadResult.size,
      type: contentType
    };
  } catch (error) {
    logger.error('Error generating image:', error);
    throw error;
  }
} 