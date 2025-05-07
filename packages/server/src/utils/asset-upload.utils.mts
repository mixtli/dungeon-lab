import storageService from '../services/storage.service.mjs';
import { logger } from './logger.mjs';
import { AssetModel } from '../features/assets/models/asset.model.mjs';
import { Types } from 'mongoose';
import type { AssetDocument } from '../features/assets/services/asset.service.mjs';

// Union type to support both browser File and Multer File
type FileInput = File | Express.Multer.File;

/**
 * Determines if the file is a browser File or Multer File
 */
function isWebFile(file: FileInput): file is File {
  return (
    typeof (file as File).arrayBuffer === 'function' && 
    (file as File).name !== undefined && 
    !('buffer' in file)
  );
}

/**
 * Creates an Asset document from either a Web API File object or an Express Multer file
 * 
 * @param file - The File object to create an asset from (can be Web API File or Express Multer File)
 * @param prefix - Prefix to use in the storage path after the userId (e.g., 'uploads/maps')
 * @param userId - ID of the user creating the asset
 * @returns Asset document created in the database
 */
export async function createAsset(
  file: FileInput,
  prefix: string,
  userId: string
): Promise<AssetDocument> {
  try {
    // Extract file information based on the type of file
    let buffer: Buffer;
    let originalname: string;
    let mimetype: string;
    let size: number;
    
    if (isWebFile(file)) {
      // Web API File
      buffer = Buffer.from(await file.arrayBuffer());
      originalname = file.name;
      mimetype = file.type;
      size = file.size;
    } else {
      // Express Multer File
      buffer = file.buffer;
      originalname = file.originalname;
      mimetype = file.mimetype;
      size = file.size;
    }
    
    // Generate the full folder path
    const folder = `users/${userId}/${prefix}`;
    
    // Upload to storage service
    const uploadResult = await storageService.uploadFile(
      buffer,
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