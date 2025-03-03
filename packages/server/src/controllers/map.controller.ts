import { Request, Response } from 'express';
import { MapModel } from '../models/map.model.js';
import { CreateMapDto, UpdateMapDto } from '@dungeon-lab/shared';
import { MinioService } from '../services/minio.service.js';
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

export async function createMap(req: Request, res: Response) {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name, description, gridColumns } = req.body as CreateMapDto;
    const image = req.file;
    
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image and get dimensions
    const imageMetadata = await sharp(image.buffer).metadata();
    const aspectRatio = imageMetadata.width! / imageMetadata.height!;
    const gridRows = Math.round(gridColumns / aspectRatio);

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
      name,
      description,
      imageUrl: imageKey,
      thumbnailUrl: thumbnailKey,
      gridColumns,
      gridRows,
      aspectRatio,
      createdBy: req.session.user.id,
    });

    const mapWithUrls = await addPresignedUrls(map);
    res.status(201).json(mapWithUrls);
  } catch (error) {
    console.error('Error creating map:', error);
    res.status(500).json({ message: 'Error creating map' });
  }
}

export async function getMaps(req: Request, res: Response) {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const maps = await MapModel.find({ createdBy: req.session.user.id });
    const mapsWithUrls = await Promise.all(maps.map(addPresignedUrls));
    res.json(mapsWithUrls);
  } catch (error) {
    console.error('Error fetching maps:', error);
    res.status(500).json({ message: 'Error fetching maps' });
  }
}

export async function getMap(req: Request, res: Response) {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const map = await MapModel.findOne({
      _id: req.params.id,
      createdBy: req.session.user.id,
    });

    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    const mapWithUrls = await addPresignedUrls(map);
    res.json(mapWithUrls);
  } catch (error) {
    console.error('Error fetching map:', error);
    res.status(500).json({ message: 'Error fetching map' });
  }
}

export async function updateMap(req: Request, res: Response) {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updates = req.body as UpdateMapDto;
    
    const map = await MapModel.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.session.user.id },
      updates,
      { new: true }
    );
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    res.json(map);
  } catch (error) {
    console.error('Error updating map:', error);
    res.status(500).json({ message: 'Error updating map' });
  }
}

export async function deleteMap(req: Request, res: Response) {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const map = await MapModel.findOne({
      _id: req.params.id,
      createdBy: req.session.user.id,
    });
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    // Delete images from Minio
    await minioService.deleteObject(`maps/${req.params.id}/original.jpg`);
    await minioService.deleteObject(`maps/${req.params.id}/thumbnail.jpg`);
    
    await map.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting map:', error);
    res.status(500).json({ message: 'Error deleting map' });
  }
}

export async function getMapImageUrl(req: Request, res: Response) {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const map = await MapModel.findOne({
      _id: req.params.id,
      createdBy: req.session.user.id,
    });

    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }

    const imageUrl = await minioService.getPresignedUrl(map.imageUrl);
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error getting map image URL:', error);
    res.status(500).json({ message: 'Error getting map image URL' });
  }
} 