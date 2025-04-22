import sharp from 'sharp';
import { IMap } from '@dungeon-lab/shared/index.mjs';
import { generateAIImage } from '../../../utils/image-generator.mjs';

// Process map image to maintain aspect ratio and ensure proper format
async function processMapImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1024, 1024, { fit: 'inside' })
    .jpeg()
    .toBuffer();
}

// Generate a map image
export async function generateMapImage(map: IMap): Promise<File> {
  // Generate the image using AI
  const imageData = await generateAIImage(
    'A detailed top-down battle map for a tabletop RPG. The map should be clear and well-lit with a grid-friendly layout. Do not include any text or labels or grid lines.',
    map,
    '1024x1024',
    {
      fileName: 'map.jpg',
      folder: `maps/${map.id!}`,
      processImage: processMapImage,
      contentType: 'image/jpeg'
    }
  );
  
  return imageData;
} 