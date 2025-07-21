import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.mjs';

export interface FoundryAsset {
  originalPath: string;
  localPath: string;
  mimetype: string;
  size: number;
}

export interface ProcessedAsset {
  originalPath: string;
  outputPath: string;
  mimetype: string;
  size: number;
  exists: boolean;
}

export interface AssetProcessingResult {
  processed: ProcessedAsset[];
  failed: Array<{ path: string; error: string }>;
  totalSize: number;
}

/**
 * Service for processing Foundry VTT assets (images, etc.)
 */
export class FoundryAssetProcessorService {

  /**
   * Process assets from a Foundry data directory by copying them to output
   */
  async processAssetsFromDirectory(
    foundryDataPath: string,
    outputPath: string,
    assetReferences: Set<string>,
    additionalAssetPaths?: string[],
    progressCallback?: (processed: number, total: number) => void
  ): Promise<Map<string, string>> {
    const assetMapping = new Map<string, string>();
    
    // Combine asset references with additional paths (from token mappings)
    const allAssetPaths = new Set([...assetReferences, ...(additionalAssetPaths || [])]);
    const assetPaths = Array.from(allAssetPaths);
    
    logger.info(`Processing ${assetPaths.length} asset references (${assetReferences.size} from documents, ${additionalAssetPaths?.length || 0} from token mappings)`);

    // Ensure assets output directory exists
    const assetsOutputDir = path.join(outputPath, 'assets');
    await fs.mkdir(assetsOutputDir, { recursive: true });

    for (let i = 0; i < assetPaths.length; i++) {
      const assetPath = assetPaths[i];
      
      try {
        const foundryAsset = await this.locateFoundryAsset(foundryDataPath, assetPath);
        if (foundryAsset) {
          const outputFilename = await this.copyAssetToOutput(foundryAsset, assetsOutputDir);
          assetMapping.set(assetPath, outputFilename);
          logger.debug(`Copied asset: ${assetPath} -> ${outputFilename}`);
        } else {
          logger.warn(`Asset not found: ${assetPath}`);
        }
      } catch (error) {
        logger.error(`Failed to process asset ${assetPath}:`, error);
      }

      progressCallback?.(i + 1, assetPaths.length);
    }

    logger.info(`Asset processing complete: ${assetMapping.size} assets copied`);
    return assetMapping;
  }

  /**
   * Process assets from a list of local files
   */
  async processLocalAssets(
    assets: FoundryAsset[],
    userId: string,
    compendiumName: string,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<AssetProcessingResult> {
    const result: AssetProcessingResult = {
      processed: [],
      failed: [],
      totalSize: 0
    };

    logger.info(`Processing ${assets.length} local assets`);

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      try {
        const processed = await this.uploadFoundryAsset(asset, userId, compendiumName);
        result.processed.push(processed);
        result.totalSize += processed.size;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failed.push({
          path: asset.originalPath,
          error: errorMessage
        });
        logger.error(`Failed to process asset ${asset.originalPath}:`, error);
      }

      progressCallback?.(i + 1, assets.length);
    }

    logger.info(`Asset processing complete: ${result.processed.length} processed, ${result.failed.length} failed`);
    return result;
  }

  /**
   * Locate a Foundry asset in the data directory
   */
  async locateFoundryAsset(foundryDataPath: string, assetPath: string): Promise<FoundryAsset | null> {
    try {
      // Normalize the asset path (remove leading slashes, etc.)
      const normalizedPath = this.normalizeAssetPath(assetPath);
      
      // Get the base system directory - need to go up from /packs to system root
      // foundryDataPath is like: ~/Library/.../FoundryVTT/Data/systems/dnd5e/packs/actors24
      // We want: ~/Library/.../FoundryVTT/Data/systems/dnd5e
      const systemBaseDir = foundryDataPath.includes('/packs/') 
        ? foundryDataPath.split('/packs/')[0]
        : path.dirname(foundryDataPath);
      
      // Also get the broader Data directory for modules
      // ~/Library/.../FoundryVTT/Data
      const foundryDataRoot = systemBaseDir.includes('/systems/')
        ? systemBaseDir.split('/systems/')[0]
        : path.dirname(path.dirname(systemBaseDir));
      
      // Try different possible locations in order of preference
      const possiblePaths = [
        // Direct system path (for systems/dnd5e/tokens/beast/GiantCentipede.webp)
        path.join(foundryDataRoot, normalizedPath),
        
        // System-relative paths
        path.join(systemBaseDir, normalizedPath.replace(/^systems\/[^/]+\//, '')),
        
        // Icons and tokens directories with full subdirectory structure
        path.join(systemBaseDir, 'tokens', normalizedPath.split('/').slice(-2).join('/')), // beast/GiantCentipede.webp
        path.join(systemBaseDir, 'icons', normalizedPath.split('/').slice(-2).join('/')),
        
        // Icons and tokens with just filename
        path.join(systemBaseDir, 'tokens', path.basename(normalizedPath)),
        path.join(systemBaseDir, 'icons', path.basename(normalizedPath)),
        
        // Module paths (for modules/dnd-monster-manual/...)
        path.join(foundryDataRoot, normalizedPath),
        
        // Legacy paths
        path.join(foundryDataPath, normalizedPath),
        path.join(foundryDataPath, 'Data', normalizedPath)
      ];

      logger.debug(`Looking for asset: ${assetPath}`);
      logger.debug(`Pack path: ${foundryDataPath}`);
      logger.debug(`System base: ${systemBaseDir}`);
      logger.debug(`Data root: ${foundryDataRoot}`);

      for (const possiblePath of possiblePaths) {
        try {
          const stats = await fs.stat(possiblePath);
          if (stats.isFile()) {
            const mimetype = this.getMimetypeFromExtension(possiblePath);
            
            logger.debug(`Found asset at: ${possiblePath}`);
            return {
              originalPath: assetPath,
              localPath: possiblePath,
              mimetype,
              size: stats.size
            };
          }
        } catch {
          // File doesn't exist at this path, try next
          logger.debug(`Not found: ${possiblePath}`);
        }
      }

      logger.warn(`Asset not found after checking ${possiblePaths.length} locations: ${assetPath}`);
      return null;

    } catch (error) {
      logger.error(`Error locating asset ${assetPath}:`, error);
      return null;
    }
  }

  /**
   * Copy a Foundry asset to output directory
   */
  private async copyAssetToOutput(
    asset: FoundryAsset,
    outputDir: string
  ): Promise<string> {
    try {
      // Generate a safe filename
      const originalFilename = path.basename(asset.originalPath);
      const sanitizedFilename = this.sanitizeFilename(originalFilename);
      const outputPath = path.join(outputDir, sanitizedFilename);
      
      // Copy the file
      await fs.copyFile(asset.localPath, outputPath);
      
      logger.debug(`Copied asset from ${asset.localPath} to ${outputPath}`);
      return sanitizedFilename;

    } catch (error) {
      logger.error(`Failed to copy asset ${asset.originalPath}:`, error);
      throw new Error(`Asset copy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload a Foundry asset to storage (legacy method for server use)
   */
  private async uploadFoundryAsset(
    _asset: FoundryAsset,
    _userId: string,
    _compendiumName: string
  ): Promise<ProcessedAsset> {
    throw new Error('Upload method not available in standalone converter');
  }

  /**
   * Sanitize filename for safe filesystem usage
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Normalize asset path for consistent lookup
   */
  private normalizeAssetPath(assetPath: string): string {
    // Remove leading slashes
    let normalized = assetPath.replace(/^\/+/, '');
    
    // Convert backslashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');
    
    // Remove any URL encoding
    normalized = decodeURIComponent(normalized);
    
    return normalized;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimetypeFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown'
    };

    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Validate that an asset path is safe to process
   */
  validateAssetPath(assetPath: string): boolean {
    // Check for path traversal attempts
    if (assetPath.includes('..') || assetPath.includes('~')) {
      return false;
    }

    // Check for absolute paths outside expected directories
    if (path.isAbsolute(assetPath) && !this.isAllowedAbsolutePath(assetPath)) {
      return false;
    }

    return true;
  }

  /**
   * Check if an absolute path is in an allowed location
   */
  private isAllowedAbsolutePath(assetPath: string): boolean {
    const allowedPrefixes = [
      '/systems/',
      '/modules/',
      '/worlds/',
      'systems/',
      'modules/',
      'worlds/'
    ];

    return allowedPrefixes.some(prefix => assetPath.startsWith(prefix));
  }

  /**
   * Get asset statistics from a set of references
   */
  async getAssetStatistics(
    foundryDataPath: string,
    assetReferences: Set<string>
  ): Promise<{
    totalAssets: number;
    foundAssets: number;
    missingAssets: number;
    totalSize: number;
    assetsByType: Record<string, number>;
  }> {
    const stats = {
      totalAssets: assetReferences.size,
      foundAssets: 0,
      missingAssets: 0,
      totalSize: 0,
      assetsByType: {} as Record<string, number>
    };

    for (const assetPath of assetReferences) {
      const asset = await this.locateFoundryAsset(foundryDataPath, assetPath);
      
      if (asset) {
        stats.foundAssets++;
        stats.totalSize += asset.size;
        
        const ext = path.extname(assetPath).toLowerCase();
        stats.assetsByType[ext] = (stats.assetsByType[ext] || 0) + 1;
      } else {
        stats.missingAssets++;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const foundryAssetProcessorService = new FoundryAssetProcessorService();