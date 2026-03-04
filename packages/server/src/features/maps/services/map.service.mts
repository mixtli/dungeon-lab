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

// Define a type for map query values
export type QueryValue = string | number | boolean | RegExp | Date | object;

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
   */
  async createMap(data: IMapCreateData, userId: string, imageFile?: File): Promise<IMap> {
    const mapData = {
      ...data,
      createdBy: userId,
      ownerId: userId,
      updatedBy: userId
    };
    const user = await UserModel.findById(userId);
    if (user?.isAdmin && data.createdBy) {
      mapData.createdBy = data.createdBy;
      mapData.ownerId = data.createdBy;
    }

    // Create map in database
    const map = await MapModel.create(mapData);
    if (map.imageId) {
      if (!map.thumbnailId) {
        await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
          mapId: map.id,
          userId,
          imageAssetId: map.imageId
        });
      }
      return map.populate(['image', 'thumbnail']);
    }

    if (imageFile) {
      logger.info('Uploading provided map image');
      const imageAsset = await createAsset(imageFile, 'maps', userId);
      map.imageId = imageAsset.id;
      await map.save();

      await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
        mapId: map.id,
        userId,
        imageAssetId: imageAsset.id
      });

      return map.populate(['image', 'thumbnail']);
    } else {
      logger.info('No image provided, scheduling map image generation job');
      await backgroundJobService.scheduleJob('now', MAP_IMAGE_GENERATION_JOB, {
        mapId: map.id,
        userId
      });
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

      const timestamp = Date.now();
      const thumbnailFilename = `thumbnail_${timestamp}.${imageMetadata.format}`;

      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside' })
        .toBuffer();

      const thumbnailFile = new File([thumbnailBuffer], thumbnailFilename, { type: mimeType });
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
    _gridColumns: number,
    userId: string
  ): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      try {
        const imageType = imageAsset.type || 'image/jpeg';
        const imageResponse = await fetch(imageAsset.url);

        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from ${imageAsset.url}`);
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const thumbnail = await this.generateAndUploadThumbnail(imageBuffer, imageType, userId);

        const updateData = {
          thumbnailId: thumbnail.id,
          updatedBy: userId,
          imageId: imageAsset.id
        };

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
      try {
        await MapModel.findByIdAndDelete(id);
      } catch (deleteError) {
        logger.error('Error deleting map after failed image processing:', deleteError);
      }

      logger.error('Error processing map images:', error);
      throw error;
    }
  }

  /**
   * Update an existing map
   */
  async updateMap(
    id: string,
    data: IMapUpdateData,
    userId: string,
    imageFile?: File
  ): Promise<IMap> {
    try {
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }

      const mapUpdateData: IMapUpdateData = { ...data, updatedBy: userId };

      if (imageFile) {
        logger.info(`Updating map ${id} with new image`);
        const newImageAsset = await createAsset(imageFile, 'maps', userId);

        if (existingMap.imageId && existingMap.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(existingMap.imageId);
            if (oldAsset) {
              await storageService.deleteFile(oldAsset.path);
              await oldAsset.deleteOne();
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${existingMap.imageId}:`, deleteError);
          }
        }

        mapUpdateData.imageId = newImageAsset.id;

        await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
          mapId: id,
          userId,
          imageAssetId: newImageAsset.id
        });
      }

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
   * Update a map's image
   */
  async updateMapImage(id: string, file: File, userId: string): Promise<IMap> {
    try {
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }

      const newImageAsset = await createAsset(file, 'maps', userId);

      if (existingMap.imageId && existingMap.imageId.toString() !== newImageAsset.id.toString()) {
        try {
          const oldAsset = await AssetModel.findById(existingMap.imageId);
          if (oldAsset) {
            await oldAsset.deleteOne();
          }
        } catch (deleteError) {
          logger.warn(`Could not delete old image asset ${existingMap.imageId}:`, deleteError);
        }
      }

      const updatedMap = await MapModel.findByIdAndUpdate(
        id,
        { imageId: newImageAsset.id, updatedBy: userId },
        { new: true }
      )
        .populate('image')
        .populate('thumbnail');

      if (!updatedMap) {
        throw new Error('Map not found after update');
      }

      await backgroundJobService.scheduleJob('now', MAP_THUMBNAIL_GENERATION_JOB, {
        mapId: id,
        userId,
        imageAssetId: newImageAsset.id
      });

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
   */
  async putMap(id: string, data: IMapUpdateData, userId: string, imageFile?: File): Promise<IMap> {
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

      if (imageFile) {
        const newImageAsset = await createAsset(imageFile, 'maps', userId);

        if (map.imageId && map.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(map.imageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${map.imageId}:`, deleteError);
          }
        }

        updateData.imageId = newImageAsset.id;
      }

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
   */
  async patchMap(id: string, data: Partial<IMap>, userId: string, imageFile?: File): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      const updateData = {
        ...data,
        updatedBy: userId
      };

      if (imageFile) {
        const newImageAsset = await createAsset(imageFile, 'maps', userId);

        if (map.imageId && map.imageId.toString() !== newImageAsset.id.toString()) {
          try {
            const oldAsset = await AssetModel.findById(map.imageId);
            if (oldAsset) {
              await oldAsset.deleteOne();
            }
          } catch (deleteError) {
            logger.warn(`Could not delete old image asset ${map.imageId}:`, deleteError);
          }
        }

        updateData.imageId = newImageAsset.id;
      }

      const obj = map.toObject();
      const newObj = deepMerge(obj, updateData);
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
   */
  async searchMaps(query: Record<string, QueryValue>): Promise<IMap[]> {
    try {
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
}
