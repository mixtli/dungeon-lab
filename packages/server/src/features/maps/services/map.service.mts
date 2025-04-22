import { IMap } from '@dungeon-lab/shared/index.mjs';
import { MapModel } from '../models/map.model.mjs';
import storageService from '../../../services/storage.service.mjs';
import sharp from 'sharp';
import { logger } from '../../../utils/logger.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { AssetDocument } from '../../../features/assets/services/asset.service.mjs';
import { AssetModel } from '../../../features/assets/models/asset.model.mjs';
import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { MAP_IMAGE_GENERATION_JOB, MAP_THUMBNAIL_GENERATION_JOB } from '../jobs/map-image.job.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/deepMerge.mjs';
import { Types } from 'mongoose';

export class MapService {
  constructor() {}

  async getMapsForCampaign(campaignId: string): Promise<IMap[]> {
    try {
      const maps = await MapModel.find({ campaignId })
        .populate('image')
        .populate('thumbnail');
      return maps;
    } catch (error) {
      logger.error('Error getting maps:', error);
      throw new Error('Failed to get maps');
    }
  }

  async getMap(id: string): Promise<IMap> {
    try {
      const map = await MapModel.findById(id)
        .populate('image')
        .populate('thumbnail');
      if (!map) {
        throw new Error('Map not found');
      }
      return map;
    } catch (error) {
      logger.error('Error getting map:', error);
      throw new Error('Failed to get map');
    }
  }

  /**
   * Create a map with its image
   * 
   * @param data - The map data
   * @param userId - ID of the user creating the map
   * @param imageFile - Optional image file for the map
   */
  async createMap(
    data: IMap, 
    userId: string, 
    imageFile?: File
  ): Promise<IMap> {
    try {
      // First create a basic map record
      const mapData = { 
        ...data, 
        gridRows: 0, // Placeholder, will be calculated after image processing
        aspectRatio: 1, // Placeholder, will be calculated after image processing
        createdBy: userId, 
        updatedBy: userId 
      };
      
      // Create map in database to get an ID
      const map = await MapModel.create(mapData);
      
      // If an image file was provided
      if (imageFile) {
        logger.info('Uploading provided map image');
        
        // Create asset using the new method
        const imageAsset = await createAsset(imageFile, 'uploads/maps', userId);
        
        // Update the map with the image ID
        map.imageId = imageAsset.id;
        await map.save();
        
        // Schedule a background job to generate the thumbnail
        await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
          mapId: map.id,
          userId,
          imageAssetId: imageAsset.id
        });
        
        logger.info(`Scheduled thumbnail generation job for map ${map.id}`);
        
        // Return the map document
        return map.populate(['image', 'thumbnail']);
      } else {
        // If no file was provided, schedule a background job to generate an image
        logger.info('No image provided, scheduling map image generation job');
        
        await backgroundJobService.scheduleJob('now', MAP_IMAGE_GENERATION_JOB, {
          mapId: map.id,
          userId
        });
        
        logger.info(`Scheduled map image generation job for map ${map.id}`);
        
        // Return the map document (image will be added asynchronously)
        return map;
      }
    } catch (error) {
      logger.error('Error creating map:', error);
      throw error;
    }
  }

  async generateMapImage(mapId: string) {
    const map = await MapModel.findById(mapId);
    if (!map) {
      throw new Error('Map not found');
    }
    await backgroundJobService.scheduleJob('now', MAP_IMAGE_GENERATION_JOB, {
      mapId: map.id,
      userId: map.createdBy
    });
  }

  /**
   * Generate and upload a map thumbnail
   */
  async generateAndUploadThumbnail(
    imageBuffer: Buffer, 
    mimeType: string,
    userId: string
  ): Promise<AssetDocument> {
    try {
      const imageMetadata = await sharp(imageBuffer).metadata();
      
      if (!imageMetadata.width || !imageMetadata.height || !imageMetadata.format) {
        throw new Error('Invalid image metadata');
      }
      
      // Generate filename with a timestamp
      const timestamp = Date.now();
      const thumbnailFilename = `thumbnail_${timestamp}.${imageMetadata.format}`;
      
      // Create thumbnail
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside' })
        .toBuffer();
      
      // Create a standard File object from the buffer
      const thumbnailFile = new File(
        [thumbnailBuffer], 
        thumbnailFilename,
        { type: mimeType }
      );
      
      // Create the asset
      return await createAsset(thumbnailFile, 'uploads/thumbnails', userId);
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Process map image to extract dimensions and generate thumbnail
   */
  async processMapImage(
    id: string, 
    imageAsset: AssetDocument, 
    gridColumns: number, 
    userId: string
  ): Promise<IMap> {
    try {
      // Get the existing map
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }
      
      try {
        // Get image type
        const imageType = imageAsset.type || 'image/jpeg';
        
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
        
        // Generate and upload thumbnail
        const thumbnail = await this.generateAndUploadThumbnail(imageBuffer, imageType, userId);
        
        // Calculate grid dimensions and aspect ratio
        const aspectRatio = imageMetadata.width / imageMetadata.height;
        const gridRows = Math.floor(gridColumns / aspectRatio);
        
        // Update the map with all the data
        const updateData = {
          gridRows,
          aspectRatio,
          thumbnailId: thumbnail.id,
          updatedBy: userId,
          imageId: imageAsset.id
        };
        
        // Update the map
        const updatedMap = await MapModel.findByIdAndUpdate(
          id,
          updateData,
          { new: true }
        )
        .populate('image')
        .populate('thumbnail');
        
        if (!updatedMap) {
          throw new Error('Map not found after update');
        }
        
        return updatedMap;
      } catch (error) {
        logger.error('Error processing image:', error);
        throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      // If there's an error, clean up by deleting the map
      try {
        await MapModel.findByIdAndDelete(id);
      } catch (deleteError) {
        logger.error('Error deleting map after failed image processing:', deleteError);
      }
      
      logger.error('Error processing map images:', error);
      throw error; // Propagate the original error
    }
  }

  /**
   * Update an existing map with new data and optionally a new image
   * @param id - The ID of the map to update
   * @param data - New data for the map
   * @param userId - ID of the user updating the map
   * @param imageFile - Optional new image file for the map
   */
  async updateMap(
    id: string, 
    data: Partial<IMap>, 
    userId: string,
    imageFile?: File
  ): Promise<IMap> {
    try {
      // Get existing map
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }
      
      // Prepare update data
      const mapUpdateData: Partial<IMap> = { ...data, updatedBy: userId };

      // Handle image file if provided
      if (imageFile) {
        logger.info(`Updating map ${id} with new image`);
        
        // Create asset using the new method
        const newImageAsset = await createAsset(imageFile, 'uploads/maps', userId);
        
        // Delete the old image asset if it exists and is different
        if (existingMap.imageId && existingMap.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(existingMap.imageId);
            if (oldAsset) {
              await storageService.deleteFile(oldAsset.path);
              await oldAsset.deleteOne();
              logger.info(`Deleted old image asset ${existingMap.imageId} for map ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${existingMap.imageId}:`, deleteError);
          }
        }

        // Update image ID in map data
        mapUpdateData.imageId = newImageAsset.id;
        
        // Schedule a thumbnail generation job in the background
        await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
          mapId: id,
          userId,
          imageAssetId: newImageAsset.id
        });
        
        logger.info(`Scheduled thumbnail generation job for updated map ${id}`);
      } else if (mapUpdateData.gridColumns && existingMap.aspectRatio) {
        // If no new image, but gridColumns changed, recalculate gridRows based on existing aspect ratio
        mapUpdateData.gridRows = Math.floor(mapUpdateData.gridColumns / existingMap.aspectRatio);
      }
      
      // Apply updates
      const updatedMap = await MapModel.findByIdAndUpdate(
        id,
        mapUpdateData,
        { new: true }
      )
      .populate('image')
      .populate('thumbnail');
      
      if (!updatedMap) {
        throw new Error('Map not found after update');
      }

      return updatedMap;
    } catch (error) {
      logger.error(`Error updating map ${id}:`, error);
      if (error instanceof Error && error.message.includes('Map not found')) {
         throw error;
      }
      throw new Error(`Failed to update map: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a map's image with a file
   * @param id - The ID of the map to update
   * @param file - The file object
   * @param userId - ID of the user updating the map
   */
  async updateMapImage(
    id: string,
    file: File,
    userId: string
  ): Promise<IMap> {
    try {
      // Get existing map
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }

      // Create the asset
      const newImageAsset = await createAsset(file, 'uploads/maps', userId);

      // Delete the old image asset if it exists and is different
      if (existingMap.imageId && existingMap.imageId.toString() !== newImageAsset.id.toString()) {
        try {
          const oldAsset = await AssetModel.findById(existingMap.imageId);
          if (oldAsset) {
            //await storageService.deleteFile(oldAsset.path);
            await oldAsset.deleteOne();
            logger.info(`Deleted old image asset ${existingMap.imageId} for map ${id}`);
          }
        } catch (deleteError) {
          logger.warn(`Could not delete old image asset ${existingMap.imageId}:`, deleteError);
        }
      }

      // Update the map with the new image ID
      const updatedMap = await MapModel.findByIdAndUpdate(
        id,
        {
          imageId: newImageAsset.id,
          updatedBy: userId
        },
        { new: true }
      )
      .populate('image')
      .populate('thumbnail');

      if (!updatedMap) {
        throw new Error('Map not found after update');
      }

      // Schedule a thumbnail generation job in the background
      await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
        mapId: id,
        userId,
        imageAssetId: newImageAsset.id
      });

      logger.info(`Scheduled thumbnail generation job for updated map ${id}`);

      return updatedMap;
    } catch (error) {
      logger.error(`Error updating map image ${id}:`, error);
      if (error instanceof Error && error.message.includes('Map not found')) {
        throw error;
      }
      throw new Error(`Failed to update map image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteMap(id: string): Promise<void> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      // Delete all asset files for this map
      await storageService.deleteDirectory(`maps/${id}`);

      await map.deleteOne();
    } catch (error) {
      logger.error('Error deleting map:', error);
      throw new Error('Failed to delete map');
    }
  }

  async getAllMaps(userId: string): Promise<IMap[]> {
    try {
      const maps = await MapModel.find({ createdBy: userId })
        .populate('image')
        .populate('thumbnail');
      return maps;
    } catch (error) {
      logger.error('Error getting all maps:', error);
      throw new Error('Failed to get maps');
    }
  }

  /**
   * Check if a map's image and thumbnail have been generated
   * @param id - The ID of the map to check
   */
  async checkMapImageStatus(id: string): Promise<{ 
    hasImage: boolean; 
    hasThumbnail: boolean; 
    pending: boolean;
  }> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }
      
      // Define a type for the job structure
      interface PendingJob {
        attrs: {
          name: string;
          data?: {
            mapId?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        };
      }
      
      // Check for pending jobs
      const pendingJobs = await backgroundJobService.getPendingJobs() as PendingJob[];
      const hasPendingImageJob = pendingJobs.some((job: PendingJob) => 
        job.attrs.name === MAP_IMAGE_GENERATION_JOB && 
        job.attrs.data?.mapId === id
      );
      
      const hasPendingThumbnailJob = pendingJobs.some((job: PendingJob) => 
        job.attrs.name === MAP_THUMBNAIL_GENERATION_JOB && 
        job.attrs.data?.mapId === id
      );
      
      return {
        hasImage: !!map.imageId,
        hasThumbnail: !!map.thumbnailId,
        pending: hasPendingImageJob || hasPendingThumbnailJob
      };
    } catch (error) {
      logger.error(`Error checking map image status for map ${id}:`, error);
      throw new Error('Failed to check map image status');
    }
  }

  /**
   * Replace a map (PUT)
   * 
   * @param id - The ID of the map to update
   * @param data - New data for the map
   * @param userId - ID of the user updating the map
   * @param imageFile - Optional new image file
   */
  async putMap(
    id: string, 
    data: IMap, 
    userId: string,
    imageFile?: File
  ): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      // Handle image file if provided
      if (imageFile) {
        // Create asset using the createAsset method
        const newImageAsset = await createAsset(imageFile, 'maps', userId);
        
        // Delete the old image asset if it exists and is different
        if (map.imageId && map.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(map.imageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old image asset ${map.imageId} for map ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${map.imageId}:`, deleteError);
          }
        }
        
        // Update image ID in map data
        updateData.imageId = newImageAsset.id;
      }

      // Replace the entire map (PUT)
      map.set(updateData);
      await map.save();

      return map.populate('image');
    } catch (error) {
      logger.error('Error in putMap service:', error);
      throw error;
    }
  }

  /**
   * Partially update a map (PATCH)
   * 
   * @param id - The ID of the map to update
   * @param data - Partial data for the map
   * @param userId - ID of the user updating the map
   * @param imageFile - Optional new image file
   */
  async patchMap(
    id: string, 
    data: Partial<IMap>, 
    userId: string,
    imageFile?: File
  ): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      // Handle image file if provided
      if (imageFile) {
        // Create asset using the createAsset method
        const newImageAsset = await createAsset(imageFile, 'maps', userId);
        
        // Delete the old image asset if it exists and is different
        if (map.imageId && map.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(map.imageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
              logger.info(`Deleted old image asset ${map.imageId} for map ${id}`);
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${map.imageId}:`, deleteError);
          }
        }
        
        // Update image ID in map data
        updateData.imageId = newImageAsset.id;
      }

      // Apply partial update using deepMerge (PATCH)
      const obj = map.toObject();
      map.set(deepMerge(obj, updateData));
      await map.save();

      return map.populate('image');
    } catch (error) {
      logger.error('Error in patchMap service:', error);
      throw error;
    }
  }
}