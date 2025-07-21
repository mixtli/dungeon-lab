import { logger } from '../utils/logger.mjs';
import { AssetMapping } from '@dungeon-lab/shared/schemas/import.schema.mjs';

export class AssetResolverService {
  private urlPattern = /(?:["'])(assets\/[^"']+)(?:["'])/g;
  private srcPattern = /src\s*=\s*["']([^"']*assets\/[^"']*)["']/gi;
  private urlFunctionPattern = /url\(['"]?([^'"]*assets\/[^'"]*)['"]*\)/gi;

  /**
   * Resolve asset references in content data by replacing relative paths with public URLs
   * 
   * @param content - The content object that may contain asset references
   * @param assetMapping - Map of original paths to asset information
   * @returns Content with resolved asset URLs
   */
  async resolveAssetReferences(
    content: unknown,
    assetMapping: Map<string, string>
  ): Promise<unknown> {
    if (!content || typeof content !== 'object') {
      return content;
    }

    // Clone the content to avoid mutating the original
    const resolvedContent = this.deepClone(content);

    // Recursively process the content
    await this.processObject(resolvedContent as Record<string, unknown>, assetMapping);

    return resolvedContent;
  }

  /**
   * Find all asset references in content
   * 
   * @param content - Content to scan for asset references
   * @returns Array of asset paths found
   */
  findAssetReferences(content: unknown): string[] {
    const assetRefs = new Set<string>();

    this.findAssetReferencesRecursive(content, assetRefs);

    return Array.from(assetRefs);
  }

  /**
   * Replace asset URLs in content with new URL mapping
   * 
   * @param content - Content to process
   * @param urlMapping - Map of old URLs to new URLs
   * @returns Content with replaced URLs
   */
  replaceAssetUrls(content: unknown, urlMapping: Map<string, string>): unknown {
    if (!content || typeof content !== 'object') {
      return content;
    }

    const processedContent = this.deepClone(content);
    this.replaceUrlsRecursive(processedContent, urlMapping);

    return processedContent;
  }

  /**
   * Create URL mapping from asset mappings
   * 
   * @param assetMappings - Array of asset mappings
   * @returns Map of original paths to public URLs
   */
  createUrlMapping(assetMappings: AssetMapping[]): Map<string, string> {
    const urlMap = new Map<string, string>();

    for (const mapping of assetMappings) {
      // Map both the original path and any variations
      urlMap.set(mapping.originalPath, mapping.publicUrl);
      
      // Also map just the filename for relative references
      const filename = mapping.originalPath.split('/').pop();
      if (filename) {
        urlMap.set(filename, mapping.publicUrl);
        urlMap.set(`assets/${filename}`, mapping.publicUrl);
      }

      // Map relative path without leading directory
      const relativePath = mapping.originalPath.replace(/^[^/]+\//, '');
      if (relativePath !== mapping.originalPath) {
        urlMap.set(relativePath, mapping.publicUrl);
      }
    }

    return urlMap;
  }

  /**
   * Recursively process an object to resolve asset references
   */
  private async processObject(obj: Record<string, unknown> | unknown[], assetMapping: Map<string, string>): Promise<void> {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
          obj[i] = this.resolveAssetUrlsInString(obj[i] as string, assetMapping);
        } else if (typeof obj[i] === 'object' && obj[i] !== null) {
          await this.processObject(obj[i] as Record<string, unknown>, assetMapping);
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = this.resolveAssetUrlsInString(obj[key] as string, assetMapping);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          await this.processObject(obj[key] as Record<string, unknown>, assetMapping);
        }
      }
    }
  }

  /**
   * Resolve asset URLs in a string
   */
  private resolveAssetUrlsInString(text: string, assetMapping: Map<string, string>): string {
    let resolved = text;

    // Replace quoted asset paths
    resolved = resolved.replace(this.urlPattern, (match, assetPath) => {
      const publicUrl = this.findAssetUrl(assetPath, assetMapping);
      if (publicUrl) {
        logger.debug(`Resolved asset: ${assetPath} -> ${publicUrl}`);
        return match.replace(assetPath, publicUrl);
      }
      return match;
    });

    // Replace src attributes
    resolved = resolved.replace(this.srcPattern, (match, assetPath) => {
      const publicUrl = this.findAssetUrl(assetPath, assetMapping);
      if (publicUrl) {
        logger.debug(`Resolved src: ${assetPath} -> ${publicUrl}`);
        return match.replace(assetPath, publicUrl);
      }
      return match;
    });

    // Replace CSS url() functions
    resolved = resolved.replace(this.urlFunctionPattern, (match, assetPath) => {
      const publicUrl = this.findAssetUrl(assetPath, assetMapping);
      if (publicUrl) {
        logger.debug(`Resolved CSS url: ${assetPath} -> ${publicUrl}`);
        return match.replace(assetPath, publicUrl);
      }
      return match;
    });

    return resolved;
  }

  /**
   * Find the public URL for an asset path
   */
  private findAssetUrl(assetPath: string, assetMapping: Map<string, string>): string | null {
    // Try exact match first
    if (assetMapping.has(assetPath)) {
      return assetMapping.get(assetPath)!;
    }

    // Try filename only
    const filename = assetPath.split('/').pop();
    if (filename && assetMapping.has(filename)) {
      return assetMapping.get(filename)!;
    }

    // Try with assets/ prefix
    const withAssetsPrefix = `assets/${filename}`;
    if (assetMapping.has(withAssetsPrefix)) {
      return assetMapping.get(withAssetsPrefix)!;
    }

    // Try without leading directory
    const withoutLeadingDir = assetPath.replace(/^[^/]+\//, '');
    if (assetMapping.has(withoutLeadingDir)) {
      return assetMapping.get(withoutLeadingDir)!;
    }

    return null;
  }

  /**
   * Recursively find asset references in content
   */
  private findAssetReferencesRecursive(obj: unknown, assetRefs: Set<string>): void {
    if (typeof obj === 'string') {
      this.extractAssetReferencesFromString(obj, assetRefs);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.findAssetReferencesRecursive(item, assetRefs);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj as Record<string, unknown>) {
        this.findAssetReferencesRecursive((obj as Record<string, unknown>)[key], assetRefs);
      }
    }
  }

  /**
   * Extract asset references from a string
   */
  private extractAssetReferencesFromString(text: string, assetRefs: Set<string>): void {
    // Find quoted asset paths
    let match;
    while ((match = this.urlPattern.exec(text)) !== null) {
      assetRefs.add(match[1]);
    }

    // Reset regex state
    this.urlPattern.lastIndex = 0;

    // Find src attributes
    while ((match = this.srcPattern.exec(text)) !== null) {
      assetRefs.add(match[1]);
    }

    this.srcPattern.lastIndex = 0;

    // Find CSS url() functions
    while ((match = this.urlFunctionPattern.exec(text)) !== null) {
      assetRefs.add(match[1]);
    }

    this.urlFunctionPattern.lastIndex = 0;
  }

  /**
   * Recursively replace URLs in content
   */
  private replaceUrlsRecursive(obj: unknown, urlMapping: Map<string, string>): void {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
          obj[i] = this.replaceUrlsInString(obj[i], urlMapping);
        } else if (typeof obj[i] === 'object' && obj[i] !== null) {
          this.replaceUrlsRecursive(obj[i], urlMapping);
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      const objRecord = obj as Record<string, unknown>;
      for (const key in objRecord) {
        if (typeof objRecord[key] === 'string') {
          objRecord[key] = this.replaceUrlsInString(objRecord[key] as string, urlMapping);
        } else if (typeof objRecord[key] === 'object' && objRecord[key] !== null) {
          this.replaceUrlsRecursive(objRecord[key], urlMapping);
        }
      }
    }
  }

  /**
   * Replace URLs in a string using mapping
   */
  private replaceUrlsInString(text: string, urlMapping: Map<string, string>): string {
    let result = text;

    for (const [oldUrl, newUrl] of urlMapping) {
      result = result.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newUrl);
    }

    return result;
  }

  /**
   * Deep clone an object
   */
  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
        cloned[key] = this.deepClone(objRecord[key]);
      }
    }

    return cloned;
  }

  /**
   * Validate that all asset references can be resolved
   * 
   * @param content - Content to validate
   * @param assetMapping - Available asset mappings
   * @returns Validation result with unresolved references
   */
  validateAssetReferences(
    content: unknown,
    assetMapping: Map<string, string>
  ): { valid: boolean; unresolvedRefs: string[] } {
    const foundRefs = this.findAssetReferences(content);
    const unresolvedRefs: string[] = [];

    for (const ref of foundRefs) {
      if (!this.findAssetUrl(ref, assetMapping)) {
        unresolvedRefs.push(ref);
      }
    }

    return {
      valid: unresolvedRefs.length === 0,
      unresolvedRefs
    };
  }
}

// Export singleton instance
export const assetResolverService = new AssetResolverService();