import { Request, Response } from 'express';
import storageService from '../../../services/storage.service.mjs';
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
    
    // Check if we have an actor ID in the body or query parameters
    const actorId = req.body.actorId || req.query.actorId as string;
    
    // Generate folder path based on available information
    let folder: string;
    
    if (actorId) {
      // If we have an actor ID, use it in the path
      folder = `actors/${actorId}/${imageType}`;
    } else {
      // Otherwise use the generic folder structure
      folder = `actors/${imageType}`;
    }
    
    // Upload to storage using the consolidated service
    const uploadResult = await storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder
    );
    
    // Generate public URL for the uploaded image (use non-expiring public URL)
    const imageUrl = storageService.getPublicUrl(uploadResult.key);
    
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