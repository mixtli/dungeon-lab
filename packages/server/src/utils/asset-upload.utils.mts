import storageService from '../services/storage.service.mjs';
import { logger } from './logger.mjs';
import { AssetModel } from '../features/assets/models/asset.model.mjs';
import { Types, ClientSession } from 'mongoose';
import type { AssetDocument } from '../features/assets/services/asset.service.mjs';
import { AssetMapping } from '@dungeon-lab/shared/schemas/import.schema.mjs';

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
      createdBy: new Types.ObjectId(userId),
      ownerId: new Types.ObjectId(userId)
    });
    
    // Return the asset document
    return asset as AssetDocument;
  } catch (error) {
    logger.error('Error creating asset:', error);
    throw new Error('Failed to create asset');
  }
}

/**
 * Create multiple assets from a collection of files (batch processing)
 * 
 * @param assetFiles - Map of relative paths to file data
 * @param userId - ID of the user creating the assets
 * @param compendiumName - Name of the compendium (used in storage path)
 * @param session - Optional MongoDB session for transactions
 * @returns Map of relative paths to created asset documents
 */
export async function createAssetsFromZip(
  assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>,
  userId: string,
  compendiumName: string,
  session?: ClientSession
): Promise<Map<string, AssetDocument>> {
  const createdAssets = new Map<string, AssetDocument>();
  const uploadErrors: string[] = [];

  try {
    logger.info(`Creating ${assetFiles.size} assets for compendium: ${compendiumName}`);

    for (const [relativePath, assetInfo] of assetFiles) {
      try {
        // Extract file information
        const { buffer, mimetype } = assetInfo;
        const fileName = relativePath.split('/').pop() || 'unknown';
        
        // Generate the full folder path
        const folder = `users/${userId}/compendiums/${compendiumName}/assets`;
        
        // Upload to storage service
        const uploadResult = await storageService.uploadFile(
          buffer,
          fileName,
          mimetype,
          folder
        );
        
        // Get the public URL
        const fileUrl = storageService.getPublicUrl(uploadResult.key);
        
        // Create an Asset record in MongoDB
        const assetData = {
          path: uploadResult.key,
          url: fileUrl,
          size: buffer.length,
          type: mimetype,
          name: fileName,
          createdBy: new Types.ObjectId(userId),
          ownerId: new Types.ObjectId(userId)
        };

        const asset = session 
          ? await AssetModel.create([assetData], { session }).then(docs => docs[0])
          : await AssetModel.create(assetData);
        
        createdAssets.set(relativePath, asset as AssetDocument);
        logger.debug(`Created asset: ${relativePath} -> ${uploadResult.key}`);
        
      } catch (error) {
        const errorMsg = `Failed to create asset ${relativePath}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        uploadErrors.push(errorMsg);
      }
    }

    if (uploadErrors.length > 0) {
      logger.warn(`Asset creation completed with ${uploadErrors.length} errors`);
      // Don't throw here - partial success is acceptable for assets
    }

    logger.info(`Successfully created ${createdAssets.size} of ${assetFiles.size} assets`);
    return createdAssets;

  } catch (error) {
    logger.error('Batch asset creation failed:', error);
    throw new Error(`Failed to create assets: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate an asset file before upload
 * 
 * @param buffer - File buffer
 * @param mimetype - MIME type of the file
 * @param maxSize - Maximum file size in bytes (default: 50MB)
 * @returns Validation result
 */
export async function validateAssetFile(
  buffer: Buffer,
  mimetype: string,
  maxSize: number = 50 * 1024 * 1024 // 50MB
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check file size
    if (buffer.length > maxSize) {
      return {
        valid: false,
        error: `File too large: ${buffer.length} bytes (max: ${maxSize} bytes)`
      };
    }

    // Check MIME type
    const allowedTypes = [
      'image/png', 
      'image/jpeg', 
      'image/webp', 
      'image/gif', 
      'image/svg+xml'
    ];

    if (!allowedTypes.includes(mimetype)) {
      return {
        valid: false,
        error: `Unsupported file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check for empty files
    if (buffer.length === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }

    // Basic header validation for images
    const validationResult = validateImageHeader(buffer, mimetype);
    if (!validationResult.valid) {
      return validationResult;
    }

    return { valid: true };

  } catch (error) {
    return {
      valid: false,
      error: `Asset validation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate image file headers to ensure file integrity
 */
function validateImageHeader(buffer: Buffer, mimetype: string): { valid: boolean; error?: string } {
  if (buffer.length < 4) {
    return { valid: false, error: 'File too small to validate' };
  }

  const header = buffer.subarray(0, 4);

  switch (mimetype) {
    case 'image/png':
      // PNG header: 89 50 4E 47
      if (header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4E || header[3] !== 0x47) {
        return { valid: false, error: 'Invalid PNG file header' };
      }
      break;

    case 'image/jpeg':
      // JPEG header: FF D8
      if (header[0] !== 0xFF || header[1] !== 0xD8) {
        return { valid: false, error: 'Invalid JPEG file header' };
      }
      break;

    case 'image/gif':
      // GIF header: 47 49 46 38 (GIF8)
      if (header[0] !== 0x47 || header[1] !== 0x49 || header[2] !== 0x46 || header[3] !== 0x38) {
        return { valid: false, error: 'Invalid GIF file header' };
      }
      break;

    case 'image/webp':
      // WebP header check requires more bytes
      if (buffer.length >= 12) {
        const riff = buffer.subarray(0, 4);
        const webp = buffer.subarray(8, 12);
        if (riff.toString() !== 'RIFF' || webp.toString() !== 'WEBP') {
          return { valid: false, error: 'Invalid WebP file header' };
        }
      }
      break;

    case 'image/svg+xml': {
      // SVG should start with XML declaration or <svg
      const start = buffer.subarray(0, 20).toString();
      if (!start.includes('<?xml') && !start.includes('<svg')) {
        return { valid: false, error: 'Invalid SVG file format' };
      }
      break;
    }
  }

  return { valid: true };
}

/**
 * Generate asset mappings for URL resolution
 * 
 * @param createdAssets - Map of created assets
 * @returns Array of asset mappings
 */
export function generateAssetMappings(
  createdAssets: Map<string, AssetDocument>
): AssetMapping[] {
  const mappings: AssetMapping[] = [];

  for (const [relativePath, asset] of createdAssets) {
    mappings.push({
      originalPath: relativePath,
      storageKey: asset.path,
      publicUrl: asset.url,
      assetId: asset.id.toString()
    });
  }

  return mappings;
} 