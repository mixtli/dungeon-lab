import { IMap } from '@dungeon-lab/shared/types/index.mjs';
import { MapModel } from '../models/map.model.mjs';
import storageService from '../../../services/storage.service.mjs';
import sharp from 'sharp';
import { logger } from '../../../utils/logger.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { AssetDocument } from '../../../features/assets/services/asset.service.mjs';
import { AssetModel } from '../../../features/assets/models/asset.model.mjs';
import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { MAP_IMAGE_GENERATION_JOB, MAP_THUMBNAIL_GENERATION_JOB } from '../jobs/map-image.job.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/index.mjs';
import { Types } from 'mongoose';
import { UserModel } from '../../../models/user.model.mjs';
import { IMapCreateData, IMapUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import { uvttSchema } from '@dungeon-lab/shared/schemas/index.mjs';

// Define a type for map query values
export type QueryValue = string | number | boolean | RegExp | Date | object;

// Interface for UVTT import options
interface UVTTImportOptions {
  name: string;
  description: string;
  campaignId?: string;
}

export class MapService {
  constructor() {}

  async getMap(id: string): Promise<IMap> {
    try {
      const map = await MapModel.findById(id).populate('image').populate('thumbnail');
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
  async createMap(data: IMapCreateData, userId: string, imageFile?: File): Promise<IMap> {
      // First create a basic map record
      const mapData = {
        ...data,
        gridRows: 0, // Placeholder, will be calculated after image processing
        aspectRatio: 1, // Placeholder, will be calculated after image processing
        createdBy: userId,
        ownerId: userId, // Set ownerId for new maps
        updatedBy: userId
      };
      const user = await UserModel.findById(userId);
      if (user?.isAdmin && data.createdBy) {
        mapData.createdBy = data.createdBy;
        mapData.ownerId = data.createdBy; // Keep ownership consistent
      }

      // Create map in database to get an ID
      const map = await MapModel.create(mapData);
      if(map.imageId) {
        if(!map.thumbnailId) {
          await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
            mapId: map.id,
            userId,
            imageAssetId: map.imageId
          });
        }
        return map.populate(['image', 'thumbnail']);
      }

      // If an image file was provided
      if (imageFile) {
        logger.info('Uploading provided map image');

        // Create asset using the new method
        const imageAsset = await createAsset(imageFile, 'maps', userId);

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
      const thumbnailFile = new File([thumbnailBuffer], thumbnailFilename, { type: mimeType });

      // Create the asset
      return await createAsset(thumbnailFile, 'thumbnails', userId);
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
        const updatedMap = await MapModel.findByIdAndUpdate(id, updateData, { new: true })
          .populate('image')
          .populate('thumbnail');

        if (!updatedMap) {
          throw new Error('Map not found after update');
        }

        return updatedMap;
      } catch (error) {
        logger.error('Error processing image:', error);
        throw new Error(
          `Failed to process image: ${error instanceof Error ? error.message : String(error)}`
        );
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
    data: IMapUpdateData,
    userId: string,
    imageFile?: File
  ): Promise<IMap> {
    try {
      // Get existing map
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }

      // Validate UVTT data if present
      if (data.uvtt) {
        try {
          data.uvtt = uvttSchema.parse(data.uvtt);
        } catch (error) {
          logger.error('UVTT validation failed during map update:', error);
          throw new Error(`Invalid UVTT data: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Prepare update data
      const mapUpdateData: IMapUpdateData = { ...data, updatedBy: userId };

      // Handle image file if provided
      if (imageFile) {
        logger.info(`Updating map ${id} with new image`);

        // Create asset using the new method
        const newImageAsset = await createAsset(imageFile, 'maps', userId);

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
      } else if (mapUpdateData.uvtt?.resolution?.map_size?.x && existingMap.aspectRatio) {
        // If no new image, but gridColumns changed, recalculate gridRows based on existing aspect ratio
        mapUpdateData.uvtt.resolution.map_size.y = Math.floor(mapUpdateData.uvtt?.resolution?.map_size?.x / existingMap.aspectRatio);
      }

      // Apply updates
      const updatedMap = await MapModel.findByIdAndUpdate(id, mapUpdateData, { new: true })
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
      throw new Error(
        `Failed to update map: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update a map's image with a file
   * @param id - The ID of the map to update
   * @param file - The file object
   * @param userId - ID of the user updating the map
   */
  async updateMapImage(id: string, file: File, userId: string): Promise<IMap> {
    try {
      // Get existing map
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }

      // Create the asset
      const newImageAsset = await createAsset(file, 'maps', userId);

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
      throw new Error(
        `Failed to update map image: ${error instanceof Error ? error.message : String(error)}`
      );
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
      const maps = await MapModel.find({ $or: [{ ownerId: userId }, { createdBy: userId }] })
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
      const pendingJobs = (await backgroundJobService.getPendingJobs()) as PendingJob[];
      const hasPendingImageJob = pendingJobs.some(
        (job: PendingJob) =>
          job.attrs.name === MAP_IMAGE_GENERATION_JOB && job.attrs.data?.mapId === id
      );

      const hasPendingThumbnailJob = pendingJobs.some(
        (job: PendingJob) =>
          job.attrs.name === MAP_THUMBNAIL_GENERATION_JOB && job.attrs.data?.mapId === id
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
  async putMap(id: string, data: IMapUpdateData, userId: string, imageFile?: File): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      // Validate UVTT data if present
      if (data.uvtt) {
        try {
          data.uvtt = uvttSchema.parse(data.uvtt);
        } catch (error) {
          logger.error('UVTT validation failed during map PUT:', error);
          throw new Error(`Invalid UVTT data: ${error instanceof Error ? error.message : String(error)}`);
        }
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
  async patchMap(id: string, data: Partial<IMap>, userId: string, imageFile?: File): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      // Validate UVTT data if present
      if (data.uvtt) {
        try {
          data.uvtt = uvttSchema.parse(data.uvtt);
        } catch (error) {
          logger.error('UVTT validation failed during map PATCH:', error);
          throw new Error(`Invalid UVTT data: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const updateData = {
        ...data,
        updatedBy: userId
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
      const newObj = deepMerge(obj, updateData);
      console.log('newObj', newObj);
      // @ts-expect-error uvtt exists
      newObj.uvtt = updateData.uvtt;
      map.set(newObj);
      await map.save();

      return map.populate('image');
    } catch (error) {
      logger.error('Error in patchMap service:', error);
      throw error;
    }
  }

  /**
   * Search maps based on query parameters
   * @param query Query object with search parameters
   * @returns Array of maps matching the search criteria
   */
  async searchMaps(query: Record<string, QueryValue>): Promise<IMap[]> {
    try {
      // Convert query to case-insensitive regex for string values
      // Only convert simple string values, not nested paths
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.')) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);

      const maps = await MapModel.find(mongoQuery).populate('image').populate('thumbnail');
      return maps;
    } catch (error) {
      logger.error('Error searching maps:', error);
      throw new Error('Failed to search maps');
    }
  }

  /**
   * Import a map from UVTT data
   * 
   * @param uvttData - The parsed UVTT data
   * @param userId - ID of the user importing the map
   * @param options - Additional options (name, description, campaignId)
   */
  async importUVTT(
    uvttData: Record<string, unknown>,
    userId: string,
    options: UVTTImportOptions
  ): Promise<IMap> {
    try {
      // Extract image data from UVTT if available
      let imageAsset: AssetDocument | null = null;
      
      if (uvttData.image && typeof uvttData.image === 'string') {
        // The image is typically stored as a base64 string
        const base64Data = uvttData.image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Create a File object from the buffer
        const imageFile = new File([imageBuffer], `${options.name}.webp`, { 
          type: 'image/webp' 
        });
        
        // Upload the image as an asset
        imageAsset = await createAsset(imageFile, 'maps', userId);
        
        // Remove the image from the UVTT data to avoid storing it twice
        const { image: _image, ...uvttWithoutImage } = uvttData;
        uvttData = uvttWithoutImage;
      }
      
      // Ensure UVTT data has all required fields
      const validUvttData = {
        format: 1.0, // Default UVTT version
        resolution: {
          map_origin: { x: 0, y: 0 },
          map_size: { x: 50, y: 50 }, // Default if not provided
          pixels_per_grid: 100 // Default if not provided
        },
        ...uvttSchema.partial().parse(uvttData)
      };
      
      // Extract resolution data for calculating grid dimensions
      let aspectRatio = undefined;
      if(validUvttData.resolution?.map_size?.x && validUvttData.resolution?.map_size?.y) {
        aspectRatio = validUvttData.resolution?.map_size?.x / validUvttData.resolution?.map_size?.y;
      }
      
      // Prepare map data
      const mapData: IMapCreateData = {
        name: options.name,
        description: options.description,
        aspectRatio,
        uvtt: validUvttData,
        createdBy: userId,
        ownerId: userId, // Set ownerId for new maps
        updatedBy: userId
      };
      
      // If this map is associated with a campaign and the model supports it
      if (options.campaignId) {
        // The MongoDB model supports campaignId even if it's not in the type
        // Use a type assertion to avoid TypeScript errors
        (mapData as IMapCreateData & { campaignId: string }).campaignId = options.campaignId;
      }
      
      // Set image ID if we have one
      if (imageAsset) {
        mapData.imageId = imageAsset.id;
      }
      
      // Create the map
      const map = await MapModel.create(mapData);
      
      // If we have an image, we'll generate a thumbnail
      if (imageAsset) {
        await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
          mapId: map.id,
          userId,
          imageAssetId: imageAsset.id
        });
        
        logger.info(`Scheduled thumbnail generation job for imported UVTT map ${map.id}`);
      }
      
      // Return the populated map
      return map.populate(['image', 'thumbnail']);
    } catch (error) {
      logger.error('Error importing UVTT map:', error);
      throw new Error(
        `Failed to import UVTT map: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get map in UVTT format with embedded base64 image
   * 
   * @param id - The ID of the map to retrieve
   * @returns UVTT formatted map data with embedded base64 image
   */
  async getMapAsUVTT(id: string): Promise<Record<string, unknown>> {
    try {
      // Get the map with populated image
      const map = await MapModel.findById(id).populate('image');
      if (!map) {
        throw new Error('Map not found');
      }

      // If there's no UVTT data, throw an error
      if (!map.uvtt) {
        throw new Error('Map does not have UVTT data');
      }

      // Start with the UVTT data from the map
      const uvttData = { ...map.uvtt } as Record<string, unknown>;
      
      // If there's an image, fetch it and convert to base64
      if (map.imageId) {
        try {
          // Get the image asset from the populated document
          const imageAsset = await AssetModel.findById(map.imageId);
          
          if (imageAsset) {
            // Fetch the image data
            const imageResponse = await fetch(imageAsset.url);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image from ${imageAsset.url}`);
            }
            
            // Convert to buffer and then to base64
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            const imageType = imageAsset.type || 'image/jpeg';
            const base64Image = `data:${imageType};base64,${imageBuffer.toString('base64')}`;
            
            // Add the base64 image to the UVTT data
            uvttData.image = base64Image;
          }
        } catch (error) {
          logger.error('Error fetching and converting image:', error);
          // Continue without the image rather than failing completely
        }
      }
      
      return uvttData;
    } catch (error) {
      logger.error('Error getting map as UVTT:', error);
      throw error;
    }
  }
}
