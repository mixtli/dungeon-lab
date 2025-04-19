import { IMap } from '@dungeon-lab/shared/index.mjs';
import { MapModel } from '../models/map.model.mjs';
import storageService from '../../../services/storage.service.mjs';
import sharp from 'sharp';
import { logger } from '../../../utils/logger.mjs';
import { UploadedAsset } from '../../../utils/asset-upload.utils.mjs';



// Add an interface for update data with assets
interface MapUpdateDataWithAssets extends Partial<IMap> {
  assets?: Record<string, UploadedAsset>;
}

export class MapService {
  constructor() {}

  async getMaps(campaignId: string): Promise<IMap[]> {
    try {
      const maps = await MapModel.find({ campaignId });
      return maps
    } catch (error) {
      logger.error('Error getting maps:', error);
      throw new Error('Failed to get maps');
    }
  }

  async getMap(id: string): Promise<IMap> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }
      return map
    } catch (error) {
      logger.error('Error getting map:', error);
      throw new Error('Failed to get map');
    }
  }

  /**
   * Create a map in the database initially without processing images
   */
  async createMapInitial(data: IMap, userId: string): Promise<IMap> {
    try {

      const mapData = { ...data, gridRows: 0, aspectRatio: 1, createdBy: userId, updatedBy: userId };
      // Create initial map in database
      const map = await MapModel.create(mapData);
      
      return map
    } catch (error) {
      logger.error('Error creating initial map:', error);
      throw new Error('Failed to create initial map');
    }
  }

  /**
   * Generate and upload a map thumbnail
   */
  async generateAndUploadThumbnail(mapId: string, imageBuffer: Buffer, mimeType: string): Promise<{
    path: string;
    url: string;
    size: number;
    type: string;
  }> {
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
      
      // Upload thumbnail
      const imageFolder = `maps/${mapId}`;
      const uploadResult = await storageService.uploadFile(
        thumbnailBuffer,
        thumbnailFilename,
        mimeType,
        imageFolder
      );
      
      const thumbnailKey = uploadResult.key;
      const thumbnailUrl = storageService.getPublicUrl(thumbnailKey);
      
      return {
        path: thumbnailKey,
        url: thumbnailUrl,
        size: thumbnailBuffer.length,
        type: mimeType
      };
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Process map images and update the map with finalized data
   */
  async processThumbnail(id: string, imageAsset: UploadedAsset, gridColumns: number, userId: string): Promise<IMap> {
    try {
      // Get the existing map
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }
      
      try {
        // Since we already have the uploaded image, we just need to generate dimensions and thumbnail
        // Fetch the image to process it (we might want to modify this approach later for efficiency)
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
        const thumbnail = await this.generateAndUploadThumbnail(id, imageBuffer, imageAsset.type);
        
        // Calculate grid dimensions and aspect ratio
        const aspectRatio = imageMetadata.width / imageMetadata.height;
        const gridRows = Math.floor(gridColumns / aspectRatio);
        
        // Update the map with final data
        const updatedMap = await MapModel.findByIdAndUpdate(
          id,
          {
            gridRows,
            aspectRatio,
            image: imageAsset,
            thumbnail,
            updatedBy: userId
          },
          { new: true }
        );
        
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

  async updateMap(id: string, data: MapUpdateDataWithAssets, userId: string): Promise<IMap> {
    try {
      // Get existing map
      const existingMap = await MapModel.findById(id);
      if (!existingMap) {
        throw new Error('Map not found');
      }
      
      // Handle image updates if a new image was uploaded
      let updateData: Partial<IMap> = { ...data, updatedBy: userId };
      
      // If we have new assets, handle them
      if (data.assets) {
        // If a new image was uploaded
        if (data.assets.image) {
          try {
            // Fetch the image to process it
            const imageAsset = data.assets.image;
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
            const thumbnail = await this.generateAndUploadThumbnail(id, imageBuffer, imageAsset.type);
            
            // Calculate grid dimensions and aspect ratio
            const aspectRatio = imageMetadata.width / imageMetadata.height;
            const gridRows = Math.floor(data.gridColumns || existingMap.gridColumns / aspectRatio);
            
            // Add image and thumbnail to update data
            updateData = {
              ...updateData,
              gridRows,
              aspectRatio,
              image: imageAsset,
              thumbnail
            };
          } catch (error) {
            logger.error('Error processing update image:', error);
            throw new Error(`Failed to process update image: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
      }
      
      // Update the map
      const map = await MapModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      if (!map) {
        throw new Error('Map not found');
      }

      return map;
    } catch (error) {
      logger.error('Error updating map:', error);
      throw error;
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
      const maps = await MapModel.find({ createdBy: userId });
      return maps
    } catch (error) {
      logger.error('Error getting all maps:', error);
      throw new Error('Failed to get maps');
    }
  }

} 