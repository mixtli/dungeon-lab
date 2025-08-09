import sharp from 'sharp';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import { generateAIImage } from './image-generator.mjs';

// Process token image to make it round with transparent background
async function processTokenImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(200, 200, { fit: 'cover' })
    .composite([
      {
        input: Buffer.from('<svg><circle cx="100" cy="100" r="100" fill="white"/></svg>'),
        blend: 'dest-in'
      }
    ])
    .png()
    .toBuffer();
}

// Process avatar image to maintain aspect ratio
async function processAvatarImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).resize(512, 512, { fit: 'inside' }).jpeg().toBuffer();
}

// Process generic image (for items, etc.)
async function processGenericImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).resize(512, 512, { fit: 'inside' }).jpeg().toBuffer();
}

// Default prompts for different document types and image types
const DEFAULT_PROMPTS = {
  actor: {
    avatar: `A full portrait of a character. Fantasy RPG digital art style with dramatic lighting and a subtle background that complements the character. Please pay attention to the character's species and other physical attributes in the data below.`,
    token: `A round token portrait showing just the head and shoulders of a character. Digital art style suitable for a fantasy RPG. The image should only be the character's head and shoulders. No additional background, character stats, or anything else. I repeat, the image should not contain anything except the border and the character's head and shoulders. That includes the area inside the border. It should just have the character's head and shoulders. The image should be centered and well-lit. Please pay attention to the character's species and other physical attributes in the data below.`
  },
  character: {
    avatar: `A full portrait of a character. Fantasy RPG digital art style with dramatic lighting and a subtle background that complements the character. Please pay attention to the character's species, race, class, and other physical attributes in the data below.`,
    token: `A round token portrait showing just the head and shoulders of a character. Digital art style suitable for a fantasy RPG. The image should only be the character's head and shoulders. No additional background, character stats, or anything else. I repeat, the image should not contain anything except the border and the character's head and shoulders. That includes the area inside the border. It should just have the character's head and shoulders. The image should be centered and well-lit. Please pay attention to the character's species, race, class, and other physical attributes in the data below.`
  },
  item: {
    image: `A detailed item illustration suitable for a fantasy RPG. Professional game asset art style with clean background. The image should focus on the item itself with appropriate lighting and detail. Please pay attention to the item's type, properties, and description in the data below.`
  }
} as const;

// Type for supported image types
export type ImageType = 'avatar' | 'token' | 'image';

// Generate options interface
interface GenerateImageOptions {
  customPrompt?: string;
  size?: '256x256' | '512x512' | '1024x1024';
}

/**
 * Generate an image for any document type (actor, character, item, etc.)
 */
export async function generateDocumentImage(
  document: BaseDocument,
  imageType: ImageType,
  options: GenerateImageOptions = {}
): Promise<File> {
  if (!document.id) {
    throw new Error(`Cannot generate ${imageType} image: Document ID is required`);
  }

  console.log(`Generating ${imageType} image for ${document.documentType}:`, document.id);

  // Determine the appropriate prompt
  let defaultPrompt: string | undefined;
  const documentTypePrompts = DEFAULT_PROMPTS[document.documentType as keyof typeof DEFAULT_PROMPTS];
  if (documentTypePrompts && imageType in documentTypePrompts) {
    defaultPrompt = documentTypePrompts[imageType as keyof typeof documentTypePrompts];
  }
  const prompt = options.customPrompt || defaultPrompt;
  
  if (!prompt) {
    throw new Error(`No prompt available for ${document.documentType} ${imageType} image generation`);
  }

  // Determine image processing function and file settings
  let processImage: (buffer: Buffer) => Promise<Buffer>;
  let fileName: string;
  let contentType: string;

  switch (imageType) {
    case 'avatar':
      processImage = processAvatarImage;
      fileName = 'avatar.jpg';
      contentType = 'image/jpeg';
      break;
    case 'token':
      processImage = processTokenImage;
      fileName = 'token.png';
      contentType = 'image/png';
      break;
    case 'image':
      processImage = processGenericImage;
      fileName = 'image.jpg';
      contentType = 'image/jpeg';
      break;
    default:
      throw new Error(`Unsupported image type: ${imageType}`);
  }

  // Generate folder path based on document type
  const folder = `${document.documentType}s/${document.id}/images`;
  const size = options.size || '1024x1024';

  return generateAIImage(prompt, document, size, {
    fileName,
    folder,
    processImage,
    contentType
  });
}

/**
 * Generate a token image for any document type
 */
export async function generateDocumentToken(
  document: BaseDocument,
  customPrompt?: string
): Promise<File> {
  return generateDocumentImage(document, 'token', { customPrompt });
}

/**
 * Generate an avatar image for any document type
 */
export async function generateDocumentAvatar(
  document: BaseDocument,
  customPrompt?: string
): Promise<File> {
  return generateDocumentImage(document, 'avatar', { customPrompt });
}

/**
 * Generate a generic image for any document type (mainly for items)
 */
export async function generateDocumentGenericImage(
  document: BaseDocument,
  customPrompt?: string
): Promise<File> {
  return generateDocumentImage(document, 'image', { customPrompt });
}