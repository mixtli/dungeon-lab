import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MapModel } from '../models/map.model.mjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { IMapCreateData, IMapUpdateData } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../utils/logger.mjs';
import { MinioService } from '../services/minio.service.mjs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const minioService = new MinioService();

async function addPresignedUrls(map: any) {
  const imageUrl = await minioService.getPresignedUrl(map.imageUrl);
  const thumbnailUrl = await minioService.getPresignedUrl(map.thumbnailUrl);
  return {
    ...map.toObject(),
    imageUrl,
    thumbnailUrl
  };
}

// Get maps for a campaign
export async function getMaps(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const maps = await MapModel.find({ campaignId: req.params.campaignId });
    return res.json(maps);
  } catch (error) {
    logger.error('Error getting maps:', error);
    return res.status(500).json({ message: 'Failed to get maps' });
  }
}

// Get a specific map
export async function getMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const map = await MapModel.findById(req.params.id);
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    return res.json(map);
  } catch (error) {
    logger.error('Error getting map:', error);
    return res.status(500).json({ message: 'Failed to get map' });
  }
}

// Create a new map
export async function createMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
    const mapData: IMapCreateData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };

    const image = req.file;
    
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image and get dimensions
    const imageMetadata = await sharp(image.buffer).metadata();
    const aspectRatio = imageMetadata.width! / imageMetadata.height!;
    const gridRows = Math.round(req.body.gridColumns / aspectRatio);

    // Generate unique ID for the map
    const mapId = uuidv4();
    
    // Create thumbnail
    const thumbnail = await sharp(image.buffer)
      .resize(300, 300, { fit: 'inside' })
      .toBuffer();

    // Upload original and thumbnail to Minio
    const imageKey = `maps/${mapId}/original.${imageMetadata.format}`;
    const thumbnailKey = `maps/${mapId}/thumbnail.${imageMetadata.format}`;

    await minioService.uploadBuffer(
      image.buffer,
      imageKey,
      image.mimetype
    );
    
    await minioService.uploadBuffer(
      thumbnail,
      thumbnailKey,
      `image/${imageMetadata.format}`
    );

    // Create map in database
    const map = await MapModel.create({
      ...mapData,
      imageUrl: imageKey,
      thumbnailUrl: thumbnailKey,
      gridRows,
      aspectRatio
    });

    const mapWithUrls = await addPresignedUrls(map);
    return res.status(201).json(mapWithUrls);
  } catch (error) {
    logger.error('Error creating map:', error);
    return res.status(500).json({ message: 'Failed to create map' });
  }
}

// Update a map
export async function updateMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const map = await MapModel.findById(req.params.id);
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    // Check if user has permission to update
    const userId = new Types.ObjectId(req.session.user.id);
    if (map.createdBy.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData: IMapUpdateData = {
      ...req.body,
      updatedBy: userId
    };

    const updatedMap = await MapModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    return res.json(updatedMap);
  } catch (error) {
    logger.error('Error updating map:', error);
    return res.status(500).json({ message: 'Failed to update map' });
  }
}

// Delete a map
export async function deleteMap(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const map = await MapModel.findById(req.params.id);
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    // Check if user has permission to delete
    const userId = new Types.ObjectId(req.session.user.id);
    if (map.createdBy.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete images from Minio
    await minioService.deleteObject(`maps/${req.params.id}/original.jpg`);
    await minioService.deleteObject(`maps/${req.params.id}/thumbnail.jpg`);
    
    await MapModel.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting map:', error);
    return res.status(500).json({ message: 'Failed to delete map' });
  }
}

export async function getMapImageUrl(req: Request, res: Response): Promise<Response | void> {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const map = await MapModel.findOne({
      _id: req.params.id,
      createdBy: new Types.ObjectId(req.session.user.id)
    });

    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    const imageUrl = await minioService.getPresignedUrl(map.imageUrl);
    return res.json({ imageUrl });
  } catch (error) {
    logger.error('Error getting map image URL:', error);
    return res.status(500).json({ message: 'Failed to get map image URL' });
  }
} 