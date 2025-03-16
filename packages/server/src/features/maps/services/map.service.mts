import { IMap, IMapCreateData, IMapUpdateData } from '@dungeon-lab/shared/index.mjs';
import { MapModel } from '../models/map.model.mjs';
import storageService from '../../../services/storage.service.mjs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { logger } from '../../../utils/logger.mjs';

// Extend the File type to include multer properties
type MulterFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
  fieldname: string;
  encoding: string;
};

// Type guard to check if we have a multer file
function isMulterFile(file: File | MulterFile): file is MulterFile {
  return 'buffer' in file && 'mimetype' in file;
}

export class MapService {
  constructor() {}

  async getMaps(campaignId: string): Promise<IMap[]> {
    try {
      const maps = await MapModel.find({ campaignId });
      return Promise.all(maps.map(map => this.addPresignedUrls(map)));
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
      return this.addPresignedUrls(map);
    } catch (error) {
      logger.error('Error getting map:', error);
      throw new Error('Failed to get map');
    }
  }

  async createMap(data: IMapCreateData & { image: File | MulterFile }, userId: string): Promise<IMap> {
    try {
      // Get the image buffer depending on the file type
      const imageBuffer = isMulterFile(data.image) 
        ? data.image.buffer 
        : Buffer.from(await data.image.arrayBuffer());

      const imageMetadata = await sharp(imageBuffer).metadata();
      
      if (!imageMetadata.width || !imageMetadata.height || !imageMetadata.format) {
        throw new Error('Invalid image metadata');
      }

      // Generate unique ID and storage keys
      const mapId = uuidv4();
      const imageKey = `maps/${mapId}/original.${imageMetadata.format}`;
      const thumbnailKey = `maps/${mapId}/thumbnail.${imageMetadata.format}`;

      // Create and upload thumbnail
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside' })
        .toBuffer();

      // Get the content type
      const contentType = isMulterFile(data.image) 
        ? data.image.mimetype 
        : data.image.type;

      // Upload files to storage using the consolidated service
      await Promise.all([
        storageService.uploadFile(imageBuffer, `original.${imageMetadata.format}`, contentType, `maps/${mapId}`),
        storageService.uploadFile(thumbnailBuffer, `thumbnail.${imageMetadata.format}`, contentType, `maps/${mapId}`)
      ]);

      // Calculate grid dimensions and aspect ratio
      const aspectRatio = imageMetadata.width / imageMetadata.height;
      const gridRows = Math.floor(data.gridColumns / aspectRatio);

      // Create map in database
      const map = await MapModel.create({
        ...data,
        imageUrl: imageKey,
        thumbnailUrl: thumbnailKey,
        gridRows,
        aspectRatio,
        createdBy: userId,
        updatedBy: userId
      });

      return this.addPresignedUrls(map);
    } catch (error) {
      logger.error('Error creating map:', error);
      throw new Error('Failed to create map');
    }
  }

  async updateMap(id: string, data: IMapUpdateData, userId: string): Promise<IMap> {
    try {
      const map = await MapModel.findByIdAndUpdate(
        id,
        { ...data, updatedBy: userId },
        { new: true }
      );
      
      if (!map) {
        throw new Error('Map not found');
      }

      return this.addPresignedUrls(map);
    } catch (error) {
      logger.error('Error updating map:', error);
      throw new Error('Failed to update map');
    }
  }

  async deleteMap(id: string): Promise<void> {
    try {
      const map = await MapModel.findById(id);
      if (!map) {
        throw new Error('Map not found');
      }

      // Delete files from storage
      await Promise.all([
        storageService.deleteFile(map.imageUrl),
        storageService.deleteFile(map.thumbnailUrl)
      ]);

      await map.deleteOne();
    } catch (error) {
      logger.error('Error deleting map:', error);
      throw new Error('Failed to delete map');
    }
  }

  async getAllMaps(userId: string): Promise<IMap[]> {
    try {
      const maps = await MapModel.find({ createdBy: userId });
      return Promise.all(maps.map(map => this.addPresignedUrls(map)));
    } catch (error) {
      logger.error('Error getting all maps:', error);
      throw new Error('Failed to get maps');
    }
  }

  private async addPresignedUrls(map: any): Promise<IMap> {
    const [imageUrl, thumbnailUrl] = await Promise.all([
      storageService.getFileUrl(map.imageUrl),
      storageService.getFileUrl(map.thumbnailUrl)
    ]);

    const mapObj = map.toObject();
    const { _id, ...rest } = mapObj;
    return {
      id: _id.toString(),
      ...rest,
      imageUrl,
      thumbnailUrl
    };
  }
} 