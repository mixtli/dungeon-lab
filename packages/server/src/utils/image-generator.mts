import { experimental_generateImage as generateImage, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { logger } from './logger.mjs';

// Generic function to generate and process an AI image
export async function generateAIImage(
  prompt: string,
  data: Record<string, unknown>,
  size: '256x256' | '512x512' | '1024x1024',
  options: {
    fileName: string;
    folder: string;
    processImage?: (buffer: Buffer) => Promise<Buffer>;
    contentType?: string;
  }
): Promise<File> {
  try {
    // get summary of data
    const summary = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: `Create a description of the following entity: ${JSON.stringify(
            data
          )}`
        }
      ]
    });

    logger.info(`Generating image with prompt: ${prompt} with ${summary.text}`);
    const { image } = await generateImage({
      // model: openai.image('dall-e-3'),
      model: openai.image('gpt-image-1'),
      prompt: `${prompt} Details: ${summary.text}`,
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
    // Return File object for caller to handle storage/asset creation
    return new File([processedBuffer], options.fileName, {
      type: options.contentType || 'image/jpeg'
    });
  } catch (error) {
    logger.error('Error generating image:', error);
    throw error;
  }
}
