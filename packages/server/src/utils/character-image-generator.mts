import sharp from 'sharp';
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
import storageService from '../services/storage.service.mjs';
import { IActor } from '@dungeon-lab/shared/index.mjs';
import { logger } from './logger.mjs';

// Function to generate image prompt based on character data
function generateImagePrompt(characterData: IActor, isToken: boolean): string {
  // For the prompt, we'll just send the entire character data as JSON
  const prompt = isToken 
    ? `A round token portrait showing just the head and shoulders of a character with the following details: ${JSON.stringify(characterData)}. The background should be transparent. Digital art style suitable for a fantasy RPG. The image should be centered and well-lit.`
    : `A full portrait of a character with the following details: ${JSON.stringify(characterData)}. Fantasy RPG digital art style with dramatic lighting and a subtle background that complements the character.`;
  
  return prompt;
}

// Function to process and save generated image
async function processAndSaveImage(
  imageBuffer: Buffer,
  actorId: string,
  isToken: boolean
): Promise<{ url: string; path: string; size: number; type: string }> {
  let processedBuffer = imageBuffer;

  if (isToken) {
    // For tokens: make it round and ensure transparent background
    processedBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'cover' })
      .composite([{
        input: Buffer.from(
          '<svg><circle cx="100" cy="100" r="100" fill="white"/></svg>'
        ),
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();
  } else {
    // For avatars: maintain aspect ratio and resize if needed
    processedBuffer = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'inside' })
      .jpeg()
      .toBuffer();
  }

  // Upload to storage
  const fileName = isToken ? 'token.png' : 'avatar.jpg';
  const contentType = isToken ? 'image/png' : 'image/jpeg';
  const folder = `actors/${actorId}/images`;

  const uploadResult = await storageService.uploadFile(
    processedBuffer,
    fileName,
    contentType,
    folder
  );

  return {
    url: storageService.getPublicUrl(uploadResult.key),
    path: uploadResult.key,
    size: uploadResult.size,
    type: contentType
  };
}

export async function generateCharacterImages(actor: IActor): Promise<{
  avatar: { url: string; path: string; size: number; type: string };
  token: { url: string; path: string; size: number; type: string };
}> {
  try {
    logger.info(`Generating images for character: ${actor.name}`);

    // Generate avatar
    const avatarPrompt = generateImagePrompt(actor, false);
    logger.info('Generating avatar with prompt:', avatarPrompt);
    
    const { image: avatarImage } = await generateImage({
      model: openai.image('dall-e-3'),
      prompt: avatarPrompt,
      size: '1024x1024'
    });

    if (!avatarImage.uint8Array) {
      throw new Error('Failed to generate avatar image');
    }

    // Generate token
    const tokenPrompt = generateImagePrompt(actor, true);
    logger.info('Generating token with prompt:', tokenPrompt);
    
    const { image: tokenImage } = await generateImage({
      model: openai.image('dall-e-3'),
      prompt: tokenPrompt,
      size: '1024x1024'
    });

    if (!tokenImage.uint8Array) {
      throw new Error('Failed to generate token image');
    }

    // Process and save images
    const [avatarAsset, tokenAsset] = await Promise.all([
      processAndSaveImage(Buffer.from(avatarImage.uint8Array), actor.id!, false),
      processAndSaveImage(Buffer.from(tokenImage.uint8Array), actor.id!, true)
    ]);

    return {
      avatar: avatarAsset,
      token: tokenAsset
    };
  } catch (error) {
    logger.error('Error generating character images:', error);
    throw error;
  }
} 