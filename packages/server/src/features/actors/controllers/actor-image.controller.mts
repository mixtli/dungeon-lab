import { Request, Response } from 'express';
import storageService from '../../../services/storage.service.mjs';
import { randomUUID } from 'crypto';
import { logger } from '../../../utils/logger.mjs';

/**
 * Upload an image for an actor (avatar or token)
 * 
 * @param req - Express request
 * @param res - Express response
 */
export async function uploadActorImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const imageType = req.params.type; // 'avatar' or 'token'
    
    if (imageType !== 'avatar' && imageType !== 'token') {
      return res.status(400).json({ message: 'Invalid image type. Must be "avatar" or "token"' });
    }
    
    // Generate unique filename
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName = `${randomUUID()}.${fileExt}`;
    const folder = `actors/${imageType}`;
    
    // Upload to storage using the consolidated service
    const uploadResult = await storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder
    );
    
    // Generate public URL for the uploaded image
    const imageUrl = await storageService.getFileUrl(uploadResult.key);
    
    return res.status(200).json({
      url: imageUrl,
      objectKey: uploadResult.key,
      size: uploadResult.size
    });
  } catch (error) {
    logger.error('Error uploading actor image:', error);
    return res.status(500).json({ message: 'Failed to upload image' });
  }
} 