import storageService from '../services/storage.service.mjs';
import { logger } from './logger.mjs';
import { AssetModel } from '../features/assets/models/asset.model.mjs';
import { Types } from 'mongoose';
import type { AssetDocument } from '../features/assets/services/asset.service.mjs';

/**
 * Creates an Asset document from a File object
 * 
 * @param file - The File object to create an asset from
 * @param prefix - Prefix to use in the storage path after the userId (e.g., 'uploads/maps')
 * @param userId - ID of the user creating the asset
 * @returns Asset document created in the database
 */
export async function createAsset(
  file: File,
  prefix: string,
  userId: string
): Promise<AssetDocument> {
  try {
    // Extract file information
    const buffer = await file.arrayBuffer();
    const originalname = file.name;
    const mimetype = file.type;
    const size = file.size;
    
    
    // Generate the full folder path
    const folder = `users/${userId}/${prefix}`;
    
    // Upload to storage service
    const uploadResult = await storageService.uploadFile(
      Buffer.from(buffer),
      originalname,
      mimetype,
      folder
    );
    
    // Get the public URL
    const fileUrl = storageService.getPublicUrl(uploadResult.key);
    
    // Create an Asset record in MongoDB
    const asset = await AssetModel.create({
      path: uploadResult.key,
      url: fileUrl,
      size,
      type: mimetype,
      name: originalname,
      createdBy: new Types.ObjectId(userId)
    });
    
    // Return the asset document
    return asset as AssetDocument;
  } catch (error) {
    logger.error('Error creating asset:', error);
    throw new Error('Failed to create asset');
  }
} 