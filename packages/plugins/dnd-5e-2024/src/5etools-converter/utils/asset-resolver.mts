/**
 * Asset resolver for 5etools images
 * Resolves image paths to actual files in the 5etools-img repository
 */
import { existsSync, readFileSync } from 'fs';
import { join, extname } from 'path';
import { ETOOLS_IMG_PATH } from '../../config/constants.mjs';

export interface ResolvedAsset {
  originalPath: string;
  resolvedPath: string;
  exists: boolean;
  mimetype?: string;
  buffer?: Buffer;
}

export class AssetResolver {
  private readonly basePath: string;
  private readonly supportedFormats = ['.webp', '.png', '.jpg', '.jpeg'];
  
  constructor(basePath?: string) {
    this.basePath = basePath || ETOOLS_IMG_PATH;
    if (!existsSync(this.basePath)) {
      console.warn(`[AssetResolver] Base path does not exist: ${this.basePath}`);
    }
  }

  /**
   * Resolve an image path to an actual file
   * @param imagePath Relative path from 5etools data (e.g., "bestiary/XMM/Aboleth.webp")
   * @returns Resolved asset information
   */
  resolveImage(imagePath: string): ResolvedAsset {
    if (!imagePath) {
      return {
        originalPath: '',
        resolvedPath: '',
        exists: false
      };
    }

    // Clean the path
    const cleanPath = imagePath.replace(/^\//, '');
    const fullPath = join(this.basePath, cleanPath);

    // Check if file exists
    const exists = existsSync(fullPath);

    const result: ResolvedAsset = {
      originalPath: imagePath,
      resolvedPath: fullPath,
      exists
    };

    if (exists) {
      // Determine mimetype
      const ext = extname(fullPath).toLowerCase();
      result.mimetype = this.getMimeType(ext);
      
      // Read the file buffer
      try {
        result.buffer = readFileSync(fullPath);
      } catch (error) {
        console.error(`[AssetResolver] Failed to read file ${fullPath}:`, error);
        result.exists = false;
      }
    }

    return result;
  }

  /**
   * Try to resolve an image with fallback extensions
   * Some images might be referenced without extension or with wrong extension
   */
  resolveImageWithFallback(imagePath: string): ResolvedAsset {
    // First try the exact path
    let result = this.resolveImage(imagePath);
    if (result.exists) return result;

    // If no extension or not found, try common formats
    const pathWithoutExt = imagePath.replace(/\.[^/.]+$/, '');
    for (const ext of this.supportedFormats) {
      const pathWithExt = pathWithoutExt + ext;
      result = this.resolveImage(pathWithExt);
      if (result.exists) return result;
    }

    // Return the original failed result
    return this.resolveImage(imagePath);
  }

  /**
   * Batch resolve multiple image paths
   */
  resolveImages(imagePaths: string[]): ResolvedAsset[] {
    return imagePaths.map(path => this.resolveImageWithFallback(path));
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(ext: string): string {
    switch (ext) {
      case '.webp':
        return 'image/webp';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      default:
        return 'image/unknown';
    }
  }

  /**
   * Check if the asset resolver is properly configured
   */
  isConfigured(): boolean {
    return existsSync(this.basePath);
  }

  /**
   * Get statistics about resolved assets
   */
  getStatistics(assets: ResolvedAsset[]): {
    total: number;
    found: number;
    missing: number;
    totalSize: number;
  } {
    let totalSize = 0;
    let found = 0;
    let missing = 0;

    for (const asset of assets) {
      if (asset.exists && asset.buffer) {
        found++;
        totalSize += asset.buffer.length;
      } else {
        missing++;
      }
    }

    return {
      total: assets.length,
      found,
      missing,
      totalSize
    };
  }
}

// Export singleton instance with default configuration
export const assetResolver = new AssetResolver();