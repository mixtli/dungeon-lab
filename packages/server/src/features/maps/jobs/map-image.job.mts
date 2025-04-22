import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { MapModel } from '../models/map.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { generateMapImage } from '../utils/map-image-generator.mjs';
import sharp from 'sharp';
import { AssetModel } from '../../../features/assets/models/asset.model.mjs';
import type { Job } from '@pulsecron/pulse';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';


// Job names
export const MAP_IMAGE_GENERATION_JOB = 'generate-map-image';
export const MAP_THUMBNAIL_GENERATION_JOB = 'generate-map-thumbnail';

/**
 * Register job handlers for map-related background jobs
 */
export async function registerMapImageJobs(): Promise<void> {
  logger.info('Registering map image and thumbnail job handlers...');
  
  // Register map image generation job
  backgroundJobService.defineJob(
    MAP_IMAGE_GENERATION_JOB,
    async (job: Job): Promise<void> => {
      const { mapId, userId } = job.attrs.data as { mapId: string; userId: string };
      
      if (!mapId || !userId) {
        throw new Error('Map ID and User ID are required for map image generation');
      }
      
      logger.info(`Starting map image generation job for map ${mapId}`);
      
      // Get the map document
      const map = await MapModel.findById(mapId);
      if (!map) {
        throw new Error(`Map not found with ID: ${mapId}`);
      }
      
      try {
        // Generate the map image using AI
        const mapImageFile = await generateMapImage(map);
        const imageAsset = await createAsset(mapImageFile, 'maps', userId);
        
        // Update the map with the image ID
        map.imageId = imageAsset.id;
        await map.save();
        
        logger.info(`Map image generated successfully for map ${mapId}`);
        
        // Schedule thumbnail generation job
        await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
          mapId,
          userId,
          imageAssetId: imageAsset.id
        });
      } catch (error) {
        logger.error(`Error generating map image for map ${mapId}:`, error);
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 2, // Limit concurrent image generations
      attempts: 3
    }
  );
  
  // Register map thumbnail generation job
  backgroundJobService.defineJob(
    MAP_THUMBNAIL_GENERATION_JOB,
    async (job: Job): Promise<void> => {
      const { mapId, userId, imageAssetId } = job.attrs.data as { 
        mapId: string; 
        userId: string; 
        imageAssetId: string 
      };
      
      if (!mapId || !userId || !imageAssetId) {
        throw new Error('Map ID, User ID, and Image Asset ID are required for thumbnail generation');
      }
      
      logger.info(`Starting thumbnail generation job for map ${mapId}`);
      
      // Get the map document
      const map = await MapModel.findById(mapId);
      if (!map) {
        throw new Error(`Map not found with ID: ${mapId}`);
      }
      
      // Get the image asset
      const imageAsset = await AssetModel.findById(imageAssetId);
      if (!imageAsset) {
        throw new Error(`Image asset not found with ID: ${imageAssetId}`);
      }
      
      try {
        // Fetch the image to process it
        const imageResponse = await fetch(imageAsset.url);
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from ${imageAsset.url}`);
        }
        
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        // Get image metadata
        const imageMetadata = await sharp(imageBuffer).metadata();
        if (!imageMetadata.width || !imageMetadata.height) {
          throw new Error('Invalid image metadata');
        }
        
        // Generate timestamp for filename
        const timestamp = Date.now();
        const thumbnailFilename = `thumbnail_${timestamp}.${imageMetadata.format || 'jpg'}`;
        
        // Create thumbnail
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(300, 300, { fit: 'inside' })
          .toBuffer();

        const thumbnailFile = new File([thumbnailBuffer], thumbnailFilename, { type: imageAsset.type || 'image/jpeg' });
        const thumbnailAsset = await createAsset(thumbnailFile, 'maps/thumbnails', userId);
        
        map.thumbnailId = thumbnailAsset.id;
        map.updatedBy = userId;
        
        await map.save();
        
        logger.info(`Thumbnail generated successfully for map ${mapId}`);
      } catch (error) {
        logger.error(`Error generating thumbnail for map ${mapId}:`, error);
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 3, // Thumbnails are less resource-intensive
      attempts: 3
    }
  );
  
  logger.info(`Map image jobs registered:
  - ${MAP_IMAGE_GENERATION_JOB}: Generates AI images for maps
  - ${MAP_THUMBNAIL_GENERATION_JOB}: Creates thumbnails for map images`);
} 