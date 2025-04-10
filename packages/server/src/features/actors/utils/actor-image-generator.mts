import sharp from 'sharp';
import { IActor } from '@dungeon-lab/shared/index.mjs';
import { generateAIImage } from '../../../utils/image-generator.mjs';

// Process token image to make it round with transparent background
async function processTokenImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(200, 200, { fit: 'cover' })
    .composite([{
      input: Buffer.from(
        '<svg><circle cx="100" cy="100" r="100" fill="white"/></svg>'
      ),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();
}

// Process avatar image to maintain aspect ratio
async function processAvatarImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(512, 512, { fit: 'inside' })
    .jpeg()
    .toBuffer();
}

// Generate a character token
export async function generateCharacterToken(character: IActor): Promise<{ url: string; path: string; size: number; type: string }> {
    console.log(JSON.stringify(character))
    console.log(character.id)
  if (!character.id) {
    throw new Error('Cannot generate token image: Actor ID is required');
  }
  console.log("Generating token image for character:", character.id);

  return generateAIImage(
    `A round token portrait showing just the head and shoulders of a character. 
    The background should be transparent. Digital art style suitable for a fantasy RPG. 
    The image should only be the character's head and shoulders.  No additional background, character stats, or anything else.
    I repeat, the image should not contain anything except the border and the character's head and shoulders.
    That includes the area inside the border.  It should just have the character's head and shoulders.
    The image should be centered and well-lit. 
    Please pay attention to the character's species and other physical attributes in the data below.`,
    character,
    '1024x1024',
    {
      entityId: character.id,
      fileName: 'token.png',
      folder: `actors/${character.id}/images`,
      processImage: processTokenImage,
      contentType: 'image/png'
    }
  );
}

// Generate a character avatar
export async function generateCharacterAvatar(character: IActor): Promise<{ url: string; path: string; size: number; type: string }> {
  if (!character.id) {
    throw new Error('Cannot generate avatar image: Actor ID is required');
  }

  return generateAIImage(
    `A full portrait of a character. Fantasy RPG digital art style with dramatic lighting and a subtle background that complements the character.
    Please pay attention to the character's species and other physical attributes in the data below.`,
    character,
    '1024x1024',
    {
      entityId: character.id,
      fileName: 'avatar.jpg',
      folder: `actors/${character.id}/images`,
      processImage: processAvatarImage,
      contentType: 'image/jpeg'
    }
  );
} 