import { Request } from 'express';
import storageService from '../services/storage.service.mjs';
import { logger } from './logger.mjs';

/**
 * Interface representing an uploaded asset
 */
export interface UploadedAsset {
  path: string;
  url: string;
  size: number;
  type: string;
}

/**
 * Upload assets from request files to storage
 * 
 * @param files - Files from the request (req.files or req.file)
 * @param modelType - Type of model (e.g., 'maps', 'actors')
 * @param modelId - ID of the model being created/updated
 * @returns Object with field names as keys and asset objects as values
 */
export async function uploadAssets(
  files: Record<string, Express.Multer.File[]> | Express.Multer.File | undefined,
  modelType: string,
  modelId: string
): Promise<Record<string, UploadedAsset>> {
  const assets: Record<string, UploadedAsset> = {};
  
  try {
    // Handle single file upload case (req.file)
    if (files && 'buffer' in files && 'fieldname' in files) {
      const singleFile = files as Express.Multer.File;
      const fieldName = singleFile.fieldname;
      assets[fieldName] = await processFile(singleFile, modelType, modelId, fieldName);
    }
    
    // Process multiple files from req.files
    else if (files && typeof files === 'object' && !('buffer' in files)) {
      const fileMap = files as Record<string, Express.Multer.File[]>;
      for (const [fieldName, fieldFiles] of Object.entries(fileMap)) {
        if (Array.isArray(fieldFiles) && fieldFiles.length > 0) {
          assets[fieldName] = await processFile(fieldFiles[0], modelType, modelId, fieldName);
        }
      }
    }
    
    return assets;
  } catch (error) {
    logger.error('Error uploading assets:', error);
    throw new Error('Failed to upload assets');
  }
}

/**
 * Process a single file upload
 */
async function processFile(
  file: Express.Multer.File,
  modelType: string,
  modelId: string,
  fieldName: string
): Promise<UploadedAsset> {
  // Create the folder path with model type, id, and field name
  const folder = `${modelType}/${modelId}/${fieldName}`;
  
  // Upload to storage service
  const uploadResult = await storageService.uploadFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    folder
  );
  
  // Get the public URL (use non-expiring public URL)
  const fileUrl = storageService.getPublicUrl(uploadResult.key);
  
  // Return asset object
  return {
    path: uploadResult.key,
    url: fileUrl,
    size: file.size,
    type: file.mimetype
  };
}

// Keep processFileUploads for backward compatibility, but refactor to use uploadAssets
export async function processFileUploads(
  req: Request, 
  modelType: string, 
  modelId: string
): Promise<Record<string, UploadedAsset>> {
  // Get files from the request
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const file = req.file;
  
  if (file) {
    return uploadAssets(file, modelType, modelId);
  } else if (files) {
    return uploadAssets(files, modelType, modelId);
  }
  
  return {};
} 